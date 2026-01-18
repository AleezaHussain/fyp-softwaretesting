import sys
import csv
from statistics import mean

if len(sys.argv) < 2:
    print("Usage: analyze_results.py <csv-file>")
    sys.exit(1)

path = sys.argv[1]
rows = []
with open(path, newline='') as f:
    reader = csv.DictReader(f)
    for r in reader:
        rows.append(r)

if not rows:
    print('No data')
    sys.exit(0)

# numeric columns: it_kW, cooling_kW, ambientC, wetbulbC
it = [float(r['it_kW']) for r in rows]
cooling = [float(r['cooling_kW']) for r in rows]
amb = [float(r['ambientC']) for r in rows]
wb = [float(r['wetbulbC']) for r in rows]

print(f"File: {path}")
print(f"Rows: {len(rows)}")
print('IT kW: min={:.2f}, max={:.2f}, avg={:.2f}'.format(min(it), max(it), mean(it)))
print('Cooling kW: min={:.2f}, max={:.2f}, avg={:.2f}, total_kWh={:.2f}'.format(min(cooling), max(cooling), mean(cooling), sum(cooling)))
print('Ambient C: min={:.2f}, max={:.2f}, avg={:.2f}'.format(min(amb), max(amb), mean(amb)))
print('Wet-bulb C: min={:.2f}, max={:.2f}, avg={:.2f}'.format(min(wb), max(wb), mean(wb)))

print('\nFirst 10 rows:')
for r in rows[:10]:
    print(r)

print('\nLast 10 rows:')
for r in rows[-10:]:
    print(r)
