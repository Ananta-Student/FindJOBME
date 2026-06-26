import csv
import json
import os

# Paths to the raw CSV contents fetched from Google Sheets
csv_paths = {
    "companies": r"C:\Users\eng18\.gemini\antigravity\brain\4aca7ba2-31e3-4fc5-9381-6f10aa718940\.system_generated\steps\39\content.md",
    "keywords": r"C:\Users\eng18\.gemini\antigravity\brain\4aca7ba2-31e3-4fc5-9381-6f10aa718940\.system_generated\steps\43\content.md",
    "phase2": r"C:\Users\eng18\.gemini\antigravity\brain\4aca7ba2-31e3-4fc5-9381-6f10aa718940\.system_generated\steps\47\content.md",
    "skills": r"C:\Users\eng18\.gemini\antigravity\brain\4aca7ba2-31e3-4fc5-9381-6f10aa718940\.system_generated\steps\51\content.md"
}

output_dir = r"d:\Eng's work\Antigravity Proj\FindJOB\data"
os.makedirs(output_dir, exist_ok=True)

def parse_csv(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Locate where the CSV content starts (after '---')
    csv_start_idx = -1
    for idx, line in enumerate(lines):
        if line.strip() == "---":
            csv_start_idx = idx + 1
            break
            
    if csv_start_idx == -1:
        print(f"Error: Could not find CSV divider in {filepath}")
        return []
        
    # Read CSV lines, stripping the metadata
    csv_content = [l for l in lines[csv_start_idx:] if l.strip()]
    
    # Use standard CSV reader
    reader = csv.DictReader(csv_content)
    rows = []
    for row in reader:
        # Filter out empty keys/values
        cleaned = {k.strip(): v.strip() for k, v in row.items() if k is not None}
        if any(cleaned.values()): # Only include rows with at least one value
            rows.append(cleaned)
    return rows

def main():
    for name, filepath in csv_paths.items():
        if not os.path.exists(filepath):
            print(f"Source file not found: {filepath}")
            continue
            
        data = parse_csv(filepath)
        out_path = os.path.join(output_dir, f"{name}.json")
        with open(out_path, "w", encoding="utf-8") as out_f:
            json.dump(data, out_f, indent=2, ensure_ascii=False)
        print(f"Successfully wrote {len(data)} items to {out_path}")

if __name__ == "__main__":
    main()
