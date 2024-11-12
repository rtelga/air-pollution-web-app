import asyncio
import sqlite3
from datetime import date, datetime, timedelta
from typing import List

import numpy as np
from fastapi import FastAPI
from pandas import read_csv, read_excel, read_sql_table

import queries


connection = sqlite3.connect("data.db")

app = FastAPI()

def import_station_data() -> None:
    url = "https://www.lcsqa.org/system/files/media/documents/Liste points de mesures 2021 pour site LCSQA_27072022.xlsx".replace(" ","%20")
    station = read_excel(url, sheet_name=1)
    df = station.set_axis(
        station.iloc[1].to_list(), axis="columns").iloc[2:]
    df = df[df.columns.values[[0,1,2,8,14,15,16,17,18,19,22]]]
    df = df.rename(
        {"Code station": "code",
        "Nom station": "name",
        "Secteur de la station": "zoneType"})
    df["department"] = df["Code commune"].apply(lambda x: x[:2])
    to_tuple = lambda x : (x,)
    df["coordinates"] = df["Longitude"].apply(to_tuple) + df["Latitude"].apply(to_tuple)
    pollutants = ["PM2.5","PM10","NO2","SO2","CO"]
    for p in pollutants:
        df[p] = np.where(
            np.apply_along_axis(
                lambda x: x[0] is np.nan,
                1,
                df[p].values), p, "")
    df["pollutants"] = df[pollutants].apply(
        lambda x: "#".join(set(list(x))).split("#")[:-1], axis=1)
    
    gb = df[
        ["department",
        "coordinates",
        "pollutants",
        "code",
        "name",
        "zoneType"]].groupby("department")
    department_codes = list(range(20))+["2A","2B"]+list(range(21, 96))+\
    ["971","972","973","974","976"]
    for code in department_codes:
        gb.get_group(str(code)).to_sql(str(code), connection)
        

async def import_pollution_data(date: date) -> None:
    await read_csv(
            f"https://files.data.gouv.fr/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/{date.year}/FR_E2_{date.isoformat()}.csv",
            sep=";").to_sql(date.isoformat(), connection)

if not(connection.cursor().execute(
    "SELECT name FROM sqlite_schema WHERE type='table'").fetchone()):
    import_station_data()
    asyncio.run([import_data(date.today()-timedelta(days=k)) for k in range(1, 15)])

@app.get("/stations/{department_code}")
def get_station_data(department_code):
    json = read_sql_table(
        str(department_code),
        "sqlite:///data.db").to_json(orient="index")
    parsed = loads(json)
    return dumps(parsed, index=4)

@app.get("/pollution/")
def get_pollution_data(station: str, pollutant: str):
    response = {}
    for date in [date.today()-timedelta(days=k) for k in range(1,15)]:
        df = read_sql_table(date.isoformat(), "sqlite:///./data.db")
        df = df[df["code site"]==station & df["Polluant"]==pollutant]
        keys = (datetime.fromisofomat(
            df["Date de début"].iloc[0][:10]+"T00:00:00")+
            timedelta(hours=k) for k in range(24))
        dictionary = {k.isoformat(): float(0) for k in keys}
        for d, v in zip(df["Date de début"], df["valeur brute"]):
            dictionary[d] = v
        response[d.isoformat()] = list(dictionary.values())
    return response
