import json
import sqlite3
from datetime import date, datetime, timedelta

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
    columns = ["Latitude", "Longitude", "code", "name"]
    gb = df[["department"]+columns].groupby("department")
    df = df[columns]
    department_codes = [f"0{x}" for x in list(range(1, 9))]+["10"]+\
    [f"{x}" for x in list(range(12, 20))+list(range(21, 46))]+["47"]+\
    [f"{x}" for x in list(range(49, 96))]+["2A","2B"]
    for code in department_codes:
        x = df.iloc[gb.indices.get(code)]
        x.to_sql(f"t_{code}", connection, if_exists="replace")

def to_table_id(date: date) -> str:
    return f"t_{date.isoformat().replace("-", "")}"

def import_pollution_data(date: date) -> None:
    url = "https://files.data.gouv.fr/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/"
    columns = ["code site", "Polluant", "Date de début", "valeur brute"]
    try:
        df = read_csv(
            f"{url}{date.year}/FR_E2_{date.isoformat()}.csv",
            sep=";"
        )
        df = df[df["validité"]==1]
        df = df[df["valeur brute"] > 0]
        df = df.fillna(float(0))
        df = df[columns].rename(columns={"code site": "code"})
    except:
        df = DataFrame(["None"]*4, columns=columns)
    df.to_sql(to_table_id(date), connection, if_exists="replace")

def get_stations(department_code: str) -> list:
    cursor = connection.cursor()
    result = []
    station_data = cursor.execute(
        "SELECT * FROM {}".format(f"t_{department_code}")
    ).fetchall()
    for x in station_data:
        pollutants = []
        recording_dates = (
            date.today()-timedelta(days=k) for k in range(1, 15)
        )
        for d in recording_dates:
            records = cursor.execute(
                '''
                SELECT Polluant, code FROM {}
                WHERE code = ?
                '''.format(to_table_id(d)),
                (x[3],)
            ).fetchall()
            pollutants += [r[0] for r in records]
            pollutants = list(
                set(pollutants) & set(["PM2.5", "PM10", "NO2", "SO2", "CO"])
            )
        if len(pollutants):
            result.append([list(x), pollutants])
    return result

def get_records(table_id: str, station: str, pollutant: str) -> list:
    records = connection.cursor().execute(
        '''
        SELECT * FROM {}
        WHERE code = ? AND Polluant = ?
        '''.format(table_id),
        (station, pollutant)
    ).fetchall()
    return list(records)

def exists_in_database(table_id: str) -> bool:
    return not(
        connection.cursor().execute(
            '''
            SELECT name FROM sqlite_master
            WHERE type='table' AND name=?
            ''',
            (table_id,)
        ).fetchone() is None
    )

def to_isoformat(table_id: str) -> str:
    return f"{table_id[2:6]}{"-"}{table_id[6:8]}{"-"}{table_id[8:]}"

def get_next_table_id(table_id: str) -> str:
    return to_table_id(
        date.fromisoformat(to_isoformat(table_id))-timedelta(days=1)
    )

def update_database() -> None:
    if not(exists_in_database("t_01")):
        import_station_data()
    starting_date, ending_date = [
        date.today()-timedelta(days=15),
        date.today()-timedelta(days=1)
    ]
    table_id = to_table_id(ending_date)
    while not(exists_in_database(table_id)):
        import_pollution_data(
            date.fromisoformat(to_isoformat(table_id)))
        table_id = get_next_table_id(table_id)

    table_id = to_table_id(starting_date-timedelta(days=1))
    cursor = connection.cursor()
    while exists_in_database(table_id):
        cursor.execute(
            "DROP TABLE {}".format(table_id))
        table_id = get_next_table_id(table_id)
