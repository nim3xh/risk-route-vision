"""Test vehicle-specific predictions"""
import requests
import json

vehicles = ['CAR', 'MOTORCYCLE', 'BUS', 'LORRY', 'VAN', 'THREE_WHEELER']
coords = [[79.8612, 6.9271], [79.8620, 6.9280]]

print('\n' + '='*60)
print('Testing XGBoost Vehicle-Specific Risk Predictions')
print('='*60 + '\n')

results = {}
for vehicle in vehicles:
    try:
        response = requests.post(
            'http://localhost:8080/api/v1/risk/score',
            json={'vehicleType': vehicle, 'coordinates': coords}
        )
        data = response.json()
        results[vehicle] = data['overall']
        
        print(f'{vehicle:15s}: Overall Risk = {data["overall"]:.4f}')
        print(f'                 Segment Scores = {[f"{s:.4f}" for s in data["segmentScores"]]}')
        print(f'                 Vehicle Factor = {data["explain"]["vehicle_factor"]}')
        print()
    except Exception as e:
        print(f'{vehicle:15s}: ERROR - {e}\n')

print('='*60)
print('Summary:')
print('='*60)
if results:
    sorted_vehicles = sorted(results.items(), key=lambda x: x[1], reverse=True)
    print('\nVehicles ranked by risk (highest to lowest):')
    for i, (vehicle, risk) in enumerate(sorted_vehicles, 1):
        print(f'{i}. {vehicle:15s}: {risk:.4f}')
    
    print(f'\nRisk Range: {min(results.values()):.4f} - {max(results.values()):.4f}')
    print(f'Risk Spread: {max(results.values()) - min(results.values()):.4f}')
else:
    print('No results collected!')

print('\n' + '='*60 + '\n')
