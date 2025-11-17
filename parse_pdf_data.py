import pdfplumber
import json
import re

pdf_path = r"d:\Qoder\GameDemo\《六景寻密令》寻密手册（无密令版）.pdf"

# Define the scenic spots mapping based on the keywords in poems
spot_keywords = {
    1: ["沙驹", "滩沙", "沙上", "神驹"],  # 海滩沙驹
    2: ["潮柱", "五阶", "五色"],  # 五色潮柱
    3: ["南天", "坊"],  # 南天古坊
    4: ["石题园", "碑题园", "花", "园号", "园名"],  # 花园石碑
    5: ["古贤", "贤像", "法", "思论", "法论"],  # 古贤雕像
    6: ["蓝浪", "石窟", "六窍", "六隙", "六窍"]  # 蓝浪石窟
}

def identify_spot_id(poem):
    """Identify spot ID based on poem content"""
    for spot_id, keywords in spot_keywords.items():
        for keyword in keywords:
            if keyword in poem:
                return spot_id
    return None

# Parse the PDF
teams_data = {}

with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        if not text:
            continue
        
        # Find all team sections
        team_pattern = r'组 (\d+) 寻密手册'
        team_matches = re.finditer(team_pattern, text)
        
        for team_match in team_matches:
            team_num = int(team_match.group(1))
            if team_num not in teams_data:
                teams_data[team_num] = []
            
            # Extract the text after this team number
            start_pos = team_match.end()
            remaining_text = text[start_pos:]
            
            # Find clues for this team (up to next team or end of text)
            next_team = re.search(r'组 \d+ 寻密手册', remaining_text)
            if next_team:
                team_text = remaining_text[:next_team.start()]
            else:
                team_text = remaining_text
            
            # Extract clues
            clue_pattern = r'(\d+)\.\s*第[一二三]景线索\s*诗句：([^\n]+)'
            clues = re.findall(clue_pattern, team_text)
            
            for sequence_str, poem in clues:
                sequence = int(sequence_str)
                poem = poem.strip()
                spot_id = identify_spot_id(poem)
                
                if spot_id and len(teams_data[team_num]) < 3:
                    teams_data[team_num].append({
                        "sequence": sequence,
                        "poem": poem,
                        "spotId": spot_id
                    })

# Print the parsed data
print("Parsed Teams Data:")
print(json.dumps(teams_data, ensure_ascii=False, indent=2))

# Generate the team_spot_mapping
team_spot_mapping = []

# Known digits for each spot (based on the pattern from example)
# Each team visits 3 spots and gets digits 1, 2, 3
for team_num in sorted(teams_data.keys()):
    clues = teams_data[team_num]
    for clue in clues:
        mapping = {
            "_id": f"team-{team_num}-sequence-{clue['sequence']}",
            "teamNumber": team_num,
            "spotId": clue['spotId'],
            "digit": clue['sequence'],  # The digit is the sequence number
            "sequence": clue['sequence'],
            "poem": clue['poem']
        }
        team_spot_mapping.append(mapping)

# Save to JSON file
output_file = r"d:\Qoder\GameDemo\team_spot_mapping_parsed.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(team_spot_mapping, f, ensure_ascii=False, indent=2)

print(f"\n\nTotal mappings: {len(team_spot_mapping)}")
print(f"Saved to: {output_file}")

# Print summary
print("\n\nSummary by team:")
for team_num in sorted(teams_data.keys()):
    spots = [str(c['spotId']) for c in teams_data[team_num]]
    print(f"Team {team_num}: visits spots {', '.join(spots)}")
