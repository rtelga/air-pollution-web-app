from datetime import date, datetime, timedelta

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pandas import DataFrame

import database as db

db.update_database()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"])


@app.get("/stations")
def get_stations(department: str):
    return db.get_stations(department)

@app.get("/data")
def get_pollution_data(station: str, pollutant: str):
    response = {}
    for d in [date.today()-timedelta(days=k) for k in range(1, 15)]:
        table_id = f"t_{d.isoformat().replace("-", "")}"
        try:
            df = DataFrame.from_records(
                db.get_records(table_id, station, pollutant),
                columns=["x", "s", "p", "date", "value"])
            df["date"] = df["date"].apply(
                lambda x: datetime.fromisoformat(
                    f"{x[:10].replace("/", "-")}T{x[11:]}"))
            datetimes = (datetime.fromisoformat(
                f"{df["date"].iloc[0].date().isoformat()}T00:00:00")+
                timedelta(hours=k) for k in range(24))
            dictionary = {x.isoformat(): -1 for x in datetimes}
            for d, v in zip(df["date"], df["value"]):
                dictionary[d.isoformat()] = v
            response[table_id] = list(dictionary.values())
        except:
            response[table_id] = []
    return list(response.values())
