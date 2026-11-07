import csv
import pdfplumber

pdf_path = "a.pdf"
csv_path = "Product_Names.csv"

with (
    pdfplumber.open(pdf_path) as pdf,
    open(csv_path, "w", newline="", encoding="utf-8") as f,
):
  writer = csv.writer(f)
  writer.writerow(["Product Name"])

  for page in pdf.pages:
    table = page.extract_table()
    if table:
      for row in table[1:]:  # skip the header row on each page
        if len(row) > 1 and row[1]:
          # Clean whitespace and newlines inside cells
          name = " ".join(row[1].split())
          writer.writerow([name])

print("Extracted all 7,100 products to Product_Names.csv!")