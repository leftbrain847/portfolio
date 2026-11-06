"""Generate the synthetic data warehouse CSVs in this folder.

Run from the repo root:  python3 data/generate_synthetic_data.py
Standard library only. Seeded, so every run produces the same files.
"""
import csv
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(847)
OUT = Path(__file__).parent

# Patients per hospital and each hospital's typical alignment with Goldman
LOCATIONS = {
    'Hospital A': (333, 0.92), 'Hospital B': (376, 0.88), 'Hospital C': (120, 0.93),
    'Hospital D': (449, 0.94), 'Hospital E': (359, 0.81), 'Hospital F': (985, 0.86),
    'Hospital G': (376, 0.93),
}
FIRST = 'ABCDEFJLMSV'
LAST = ['Bennet', 'Hall', 'Morales', 'Gutierrez', 'Harris', 'Morris', 'Diaz', 'Roberts', 'Moore',
        'Smith', 'Bailey', 'Turner', 'Evans', 'Cox', 'Young', 'Reed', 'Cruz', 'Garcia', 'Jackson',
        'Robinson', 'Rivera', 'Kelly', 'Perez', 'Gomez', 'Mitchell', 'Morgan', 'Johnson', 'Davis',
        'Carter', 'Richardson', 'Patel', 'Williams', 'Murphy', 'Wright', 'Lee', 'Nguyen', 'Brooks',
        'Price', 'Ward', 'Foster', 'Hughes', 'Long', 'Ross', 'Powell', 'Jenkins', 'Perry', 'Russell',
        'Sanders', 'Bell', 'Coleman', 'Butler', 'Barnes', 'Fisher', 'Henderson', 'Graham', 'Wallace',
        'West', 'Cole', 'Hayes', 'Bryant', 'Gibson', 'Ellis', 'Stevens', 'Tucker', 'Porter', 'Hunter',
        'Hicks', 'Crawford', 'Boyd', 'Mason', 'Warren', 'Dixon', 'Ramos', 'Burns', 'Gordon', 'Shaw',
        'Holmes', 'Rice', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Grant', 'Knight', 'Ferguson',
        'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne',
        'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner']
COMPLAINTS = [  # (key, description, value set); only the first three are cardiac intake complaints
    ('C937', 'Chest pain or discomfort', 'VS301'),
    ('C941', 'Palpitations or irregular heartbeat', 'VS301'),
    ('C446', 'Shortness of breath', 'VS302'),
    ('C212', 'Headache', 'VS310'),
    ('C318', 'Abdominal pain', 'VS311'),
]
ARREST_DX = [  # (key, description, value set)
    ('DX341', 'Cardiac arrest, unspecified', 'VS507'),
    ('DX342', 'Ventricular fibrillation', 'VS507'),
    ('DX343', 'Pulseless electrical activity', 'VS507'),
    ('DX344', 'Acute transmural myocardial infarction', 'VS519'),
]
OTHER_DX = [('DX120', 'Migraine, unspecified', 'VS210'), ('DX205', 'Gastritis, unspecified', 'VS211')]
VALUE_SETS = [('VS507', 'Cardiovascular Distress'), ('VS519', 'Respiratory Distress'),
              ('VS210', 'Neurological'), ('VS211', 'Gastrointestinal')]


def write(name, header, rows):
    with open(OUT / f'{name}.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


# Clinicians: about one per 30 patients, each with a skill level near the hospital's
names = random.sample([f'Dr. {f} {l}' for f in FIRST for l in LAST], k=sum(n for n, _ in LOCATIONS.values()) // 30)
clinicians, by_location, i = [], {}, 0
for loc, (n, base) in LOCATIONS.items():
    for _ in range(max(1, round(n / 30))):
        if i == len(names):
            break
        skill = min(0.99, max(0.6, random.gauss(base, 0.05)))
        c = {'ClinicianID': f'CL{1000 + i}', 'ClinicianName': names[i], 'ClinicianLocation': loc,
             'LocationCode': loc, 'Index': i, 'LocationSkew': base,
             'Cat1Skew': round(random.uniform(-0.05, 0.05), 3), 'Cat2Skew': round(random.uniform(-0.05, 0.05), 3),
             'Cat3Skew': round(random.uniform(-0.05, 0.05), 3), 'skill': skill}
        clinicians.append(c)
        by_location.setdefault(loc, []).append(c)
        i += 1

facts, patient_id, start = [], 1374000, date(2024, 1, 1)
for loc, (n, _) in LOCATIONS.items():
    # ~10% non-cardiac complaints, which the analysis filters out
    for _ in range(round(n / 0.9)):
        patient_id += random.randint(1, 3)
        doc = random.choice(by_location[loc])
        complaint = random.choices(COMPLAINTS, weights=[45, 15, 30, 5, 5])[0]
        intake = start + timedelta(days=random.randrange(366))

        # Goldman: higher risk -> Admit. Arrest risk depends on Goldman's risk tier.
        goldman_status = random.choices([1, 2, 3, 4], weights=[25, 20, 30, 25])[0]
        goldman = 'Admit' if goldman_status >= 3 else 'Send Home'
        likelihood = round(random.uniform(0.55, 0.8) if goldman == 'Admit' else random.uniform(0.01, 0.07), 3)
        arrest = random.random() < likelihood

        aligned = random.random() < doc['skill']
        decision = goldman if aligned else ('Send Home' if goldman == 'Admit' else 'Admit')
        admitted = decision == 'Admit'

        if complaint[0] not in ('C937', 'C941', 'C446'):
            primary_dx = random.choice(OTHER_DX)[0]
        elif admitted and arrest:
            primary_dx = random.choice(ARREST_DX)[0]
        else:
            primary_dx = ''

        facts.append({
            'EventCode': len(facts) + 1,
            'PatientID': patient_id,
            'IntakeDate': intake.isoformat(),
            'AdmissionDate': intake.isoformat() if admitted else '',
            'AdmissionStatus': 'Admitted' if admitted else 'Discharged',
            'Location': loc,
            'IntakeClinicianID': doc['ClinicianID'],
            'IntakeClinicianName': doc['ClinicianName'],
            'PresentingComplaint': complaint[0],
            'PrimaryDx': primary_dx,
            'ClinicianDecision': decision,
            'GoldmanRecommendation': goldman,
            'GoldmanStatus': goldman_status,
            'CardiacArrestLikelihood': likelihood,
            'CardiacArrestWithin3DaysOfBeingSentHome': int(arrest and not admitted),
            'CardiacHistory': random.choices(['Yes', 'No'], weights=[goldman_status, 4])[0],
            'ConronaryAngiographyReading': random.choices(['Normal', 'Mild', 'Moderate', 'Severe'],
                                                          weights=[5 - goldman_status, 3, goldman_status, goldman_status])[0],
            'ECG': random.choices(['Normal', 'ST Elevation', 'ST Depression', 'Arrhythmia'],
                                  weights=[6 - goldman_status, goldman_status, goldman_status, 1])[0],
            'HemodynamicStatus': 'Unstable' if goldman_status == 4 and random.random() < 0.6 else 'Stable',
            'IntakeClinicianAccuracy': round(doc['skill'], 3),
        })

write('FactCardiacEvents', list(facts[0]), [list(f.values()) for f in facts])
cols = ['ClinicianID', 'ClinicianName', 'ClinicianLocation', 'LocationCode', 'Index',
        'LocationSkew', 'Cat1Skew', 'Cat2Skew', 'Cat3Skew']
write('DimClinician', cols, [[c[k] for k in cols] for c in clinicians])
write('DimLocation', ['LocationCode', 'ClinicianLocation'], [[loc, loc] for loc in LOCATIONS])
write('DimComplaint', ['ComplaintKey', 'ComplaintDescription', 'ComplaintValueSetKey'], COMPLAINTS)
write('DimDx', ['DxKey', 'DxDescription', 'DxValueSetKey'], ARREST_DX + OTHER_DX)
write('DimDxDomains', ['ValueSetKey', 'ValueSetDescription'], VALUE_SETS)
print(f'{len(facts)} intake events, {len(clinicians)} clinicians written to {OUT}')
