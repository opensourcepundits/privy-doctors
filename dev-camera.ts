import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getRequest } from '@sveltejs/kit/node';
import forge from 'node-forge';
import type { Plugin } from 'vite';

const certDir = path.resolve('.cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

function lanAddresses() {
	const addresses = new Set(['127.0.0.1']);
	for (const entries of Object.values(os.networkInterfaces())) {
		for (const entry of entries ?? []) {
			if (entry.family === 'IPv4' && !entry.internal) addresses.add(entry.address);
		}
	}
	return [...addresses];
}

function certificateCovers(pem: string, addresses: string[]) {
	const parsed = forge.pki.certificateFromPem(pem);
	if (parsed.validity.notAfter <= new Date()) return false;
	const extension = parsed.getExtension('subjectAltName') as { altNames?: { type?: number; ip?: string; value?: string }[] } | null;
	const names = new Set((extension?.altNames ?? []).map((item) => item.ip || item.value).filter(Boolean));
	return addresses.every((address) => names.has(address)) && names.has('localhost');
}

function devCertificate() {
	const addresses = lanAddresses();
	if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
		try {
			const cert = fs.readFileSync(certPath, 'utf8');
			if (certificateCovers(cert, addresses)) {
				return { key: fs.readFileSync(keyPath, 'utf8'), cert };
			}
		} catch {
			/* The saved certificate is unreadable, so a new one is created. */
		}
	}
	const keys = forge.pki.rsa.generateKeyPair(2048);
	const cert = forge.pki.createCertificate();
	cert.publicKey = keys.publicKey;
	cert.serialNumber = '01' + Date.now().toString(16);
	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + 30);
	const attrs = [{ name: 'commonName', value: 'careos.local' }];
	cert.setSubject(attrs);
	cert.setIssuer(attrs);
	cert.setExtensions([
		{
			name: 'subjectAltName',
			altNames: [
				{ type: 2, value: 'localhost' },
				...addresses.map((ip) => ({ type: 7, ip }))
			]
		}
	]);
	cert.sign(keys.privateKey, forge.md.sha256.create());
	const material = {
		key: forge.pki.privateKeyToPem(keys.privateKey),
		cert: forge.pki.certificateToPem(cert)
	};
	fs.mkdirSync(certDir, { recursive: true });
	fs.writeFileSync(keyPath, material.key);
	fs.writeFileSync(certPath, material.cert);
	return material;
}

export function cameraRequest({
	base,
	request,
	response
}: {
	base: string;
	request: IncomingMessage;
	response: ServerResponse;
}) {
	const rawHost = request.headers[':authority'] ?? request.headers.host;
	const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
	const encrypted = Boolean((request.socket as { encrypted?: boolean } | undefined)?.encrypted);
	return getRequest({
		base: host ? `${encrypted ? 'https' : 'http'}://${host}` : base,
		request,
		response
	});
}

export function devCameraBridge(): Plugin {
	return {
		name: 'dev-camera-bridge',
		configureServer(server) {
			let bridge: https.Server | null = null;
			const listen = () => {
				const address = server.httpServer?.address();
				const httpPort = typeof address === 'object' && address ? address.port : 5173;
				const httpsPort = httpPort + 1;
				bridge?.close();
				bridge = https.createServer(devCertificate(), (req, res) => {
					server.middlewares(req, res, () => {
						res.statusCode = 404;
						res.end();
					});
				});
				bridge.on('upgrade', (req, socket, head) => {
					const upstream = http.request({
						host: '127.0.0.1',
						port: httpPort,
						method: 'GET',
						path: req.url,
						headers: req.headers
					});
					upstream.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
						socket.write(
							`HTTP/1.1 ${proxyRes.statusCode ?? 101} ${proxyRes.statusMessage ?? 'Switching Protocols'}\r\n` +
								Object.entries(proxyRes.headers)
									.flatMap(([key, value]) => {
										const items = Array.isArray(value) ? value : value === undefined ? [] : [value];
										return items.map((item) => `${key}: ${item}`);
									})
									.join('\r\n') +
								'\r\n\r\n'
						);
						if (proxyHead.length) socket.write(proxyHead);
						proxySocket.pipe(socket);
						socket.pipe(proxySocket);
					});
					upstream.on('error', () => socket.destroy());
					socket.on('error', () => upstream.destroy());
					upstream.end(head);
				});
				bridge.on('error', (error: NodeJS.ErrnoException) => {
					if (error.code !== 'EADDRINUSE') console.error(error);
				});
				bridge.listen(httpsPort, '0.0.0.0', () => {
					const ips = lanAddresses().filter((ip) => ip !== '127.0.0.1');
					const shown = ips.length ? ips : ['127.0.0.1'];
					console.log(
						`\n  Phone camera: ${shown.map((ip) => `https://${ip}:${httpsPort}/`).join('  ')}\n  Accept the certificate warning once, then tap Start scanning.\n`
					);
				});
			};
			if (server.httpServer?.listening) listen();
			else server.httpServer?.once('listening', listen);
			server.httpServer?.on('close', () => bridge?.close());
		}
	};
}
