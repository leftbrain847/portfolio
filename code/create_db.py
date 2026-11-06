import os
import pandas as pd
from sqlalchemy import create_engine, types

# Set up the database connection
server = ''  # Replace with your server name or IP
database = ''  # Database name
username = ''  # Replace with your username
password = ''  # Replace with your password
# Use trusted connection for Windows Authentication
connection_string = f'mssql+pyodbc://{username}:{password}@{server}/{database}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes'
engine = create_engine(connection_string)

# Path to the directory containing CSV files
csv_directory = r'filepath'  # Replace with your directory path

# Function to create a SQLAlchemy table type map
def map_data_types(df):
    type_map = {
        'int64': types.INTEGER,
        'float64': types.Float(precision=2),
        'datetime64[ns]': types.DATETIME,
        'object': types.VARCHAR(length=255),
        'bool': types.Float(precision=2)  # Updated to map boolean to Float (precision=2)
    }
    return {col: type_map[str(dtype)] for col, dtype in zip(df.columns, df.dtypes)}

# Loop through each CSV file in the directory
for file_name in os.listdir(csv_directory):
    if file_name.endswith('.csv'):
        # Read the CSV file into a DataFrame
        file_path = os.path.join(csv_directory, file_name)
        df = pd.read_csv(file_path)

        # Generate the table name from the file name
        table_name = os.path.splitext(file_name)[0]

        # Create table if it doesn't exist and insert data
        df.to_sql(table_name, engine, if_exists='replace', index=False, dtype=map_data_types(df))
        print(f"Table '{table_name}' created and data inserted.")

print("All CSV files have been processed.")
