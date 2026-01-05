# Requires: pip install pandas openpyxl
import pandas as pd
import sys
from pathlib import Path
def convert(infile, outfile='data/Avocado registred Chemicals.csv'):
    df = pd.read_excel(infile, engine='openpyxl')
    # If columns exactly match the CSV provided, write them as-is
    df.to_csv(outfile, index=False)
    print(f'Wrote {len(df)} rows to {outfile}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python convert_excel.py yourfile.xlsx")
    else:
        convert(sys.argv[1])