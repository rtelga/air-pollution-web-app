import json
import sqlite3
from datetime import date, timedelta
from typing import List

import numpy as np
from pandas import DataFrame, read_csv, read_excel

connection = sqlite3.connect("data.db", check_same_thread=False)

def import_station_data() -> None:
    url = "https://www.lcsqa.org/system/files/media/documents/Liste points de mesures 2021 pour site LCSQA_27072022.xlsx".replace(" ","%20")
    station = read_excel(url, sheet_name=1)
    df = station.set_axis(
        station.iloc[1].to_list(), axis="columns").iloc[2:]
    df = df[df.columns.values[[0,1,2,8,14,15,16,17,18,19,22]]]
    df = df.rename(
        columns={
            "Code station": "code",
            "Nom station": "name"})
    df["department"] = df["Code commune"].apply(lambda x: x[:2])
    df["coordinates"] = df["Longitude"].apply(lambda x: [x]) + \
    df["Latitude"].apply(lambda x: [x])
    columns = ["coordinates", "code", "name"]
    gb = df[["department"]+columns].groupby("department")
    df = df[columns]
    department_codes = [f"0{x}" for x in list(range(1, 9))]+ ["10"] + \
    [f"{x}" for x in list(range(12, 20))+list(range(21, 46))]+ ["47"] + \
    [f"{x}" for x in list(range(49, 96))] + ["2A","2B"]
    dictionary = {}
    for code in department_codes:
        dictionary[code] = \
        json.loads(df.iloc[gb.indices.get(code)].to_json(orient="records"))
    json.dump(dictionary, open("stations.js", "w"), indent=4)

def import_pollution_data(date: date) -> None:
    url = "https://files.data.gouv.fr/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/"
    try:
        df = read_csv(
            f"{url}{date.year}{"/FR_E2_"}{date.isoformat()}{".csv"}",
            sep=";"
        )[
            ["code site", "Polluant", "Date de début", "valeur brute"]
        ]
        df.rename(
            columns={
                "code site": "station",
                "Polluant": "pollutant",
                "Date de début": "recording_date",
                "valeur brute": "value"},
            inplace=True)
    except:
        df = DataFrame()
    df.to_sql(
        f"t_{date.isoformat().replace("-", "")}",
        connection,
        if_exists="replace")

def get_pollutants(station: str):
    cursor = connection.cursor()
    result = []
    for d in (date.today()-timedelta(days=k) for k in range(1, 15)):
        table_id = f"t_{d.isoformat().replace("-", "")}"
        records = cursor.execute(
            '''
            SELECT pollutant, station FROM {}
            WHERE station = ?
            '''.format(table_id), (station,)).fetchall()
        result = list(set(result + list(set([r[0] for r in records]))))
    for p in result:
        if p not in ["PM2.5", "PM10", "N02", "SO2", "CO"]:
            result.remove(p)
    return result

def get_records(table_id: str, station: str, pollutant: str):
    records = connection.cursor().execute(
        '''
        SELECT * FROM {}
        WHERE station = ? AND pollutant = ?
        '''.format(table_id), (station, pollutant)).fetchall()
    return list(records)

def exists_in_database(table_id: str) -> bool:
    query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    return connection.cursor().execute(query,(table_id,)).fetchone()

def get_next_table_id(table_id: str) -> str:
    iso_format = f"{table_id[2:6]}{"-"}{table_id[6:8]}{"-"}{table_id[8:]}"
    return f"t_{(date.fromisoformat(iso_format)-timedelta(days=1)).isoformat().replace("-", "")}"

def update_database() -> None:
    starting_date, ending_date = [date.today()-timedelta(days=15), date.today()-timedelta(days=1)]
    table_id = f"t_{ending_date.isoformat().replace("-", "")}"
    while not(exists_in_database(table_id)):
        iso_format = f"{table_id[2:6]}{"-"}{table_id[6:8]}{"-"}{table_id[8:]}"
        import_pollution_data(date.fromisoformat(iso_format))
        table_id = get_next_table_id(table_id)
    table_id = f"t_{(starting_date-timedelta(days=1)).isoformat().replace("-", "")}"
    cursor = connection.cursor()
    while exists_in_database(table_id):
        cursor.execute(
            "DROP TABLE {}".format(table_id))
        table_id = get_next_table_id(table_id)
