import json

# Load and verify the database_init.json file
with open('database_init.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("✓ JSON is valid!")
print(f"\nTotal scenic spots: {len(data['collections']['scenic_spots'])}")
print(f"Total team_spot_mappings: {len(data['collections']['team_spot_mapping'])}")

# Count mappings per team
teams = {}
for mapping in data['collections']['team_spot_mapping']:
    team_num = mapping['teamNumber']
    if team_num not in teams:
        teams[team_num] = []
    teams[team_num].append(mapping['spotId'])

print("\nTeams breakdown:")
for team_num in sorted(teams.keys()):
    spots = teams[team_num]
    print(f"  Team {team_num}: {len(spots)} spots - visits spots {spots}")

# Verify all teams have 3 mappings
all_complete = all(len(spots) == 3 for spots in teams.values())
if all_complete and len(teams) == 12:
    print("\n✓ All 12 teams have complete mappings (3 spots each)")
    print(f"✓ Total mappings: {len(data['collections']['team_spot_mapping'])} (expected: 36)")
else:
    print(f"\n⚠ Warning: Not all teams have 3 mappings")
