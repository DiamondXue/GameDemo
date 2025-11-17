import pdfplumber
import json

pdf_path = r"d:\Qoder\GameDemo\《六景寻密令》寻密手册（无密令版）.pdf"

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}\n")
    for i, page in enumerate(pdf.pages):
        print(f"\n{'='*60}")
        print(f"PAGE {i+1}")
        print(f"{'='*60}")
        text = page.extract_text()
        print(text)
        print("\n")
