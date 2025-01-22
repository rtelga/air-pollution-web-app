from datetime import date, datetime, timedelta

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pandas import DataFrame

from database import get_pollutants, get_records, update_database

update_database()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"])

@app.get("/")
def get_pollution_data(station: str, pollutant: str|None = None):
    if pollutant:
        response = {}
        for recording_day in [date.today()-timedelta(days=k) for k in range(1, 15)]:
            current_key = recording_day.isoformat()
            try:
                df = DataFrame.from_records(
                    get_records(
                        f"t_{current_key.replace("-", "")}",
                        station,
                        pollutant),
                    columns=["x", "y", "recording_date", "value"])
                datetimes = (datetime.fromisoformat(
                    df["recording_date"].iloc[0][:10]+"T00:00:00")+
                    timedelta(hours=k) for k in range(24))
                dictionary = {x.isoformat(): float(0) for x in datetimes}
                for d, v in zip(df["recording_date"], df["value"]):
                    dictionary[d] = v
                response[current_key] = list(dictionary.values())
            except:
                response[current_key] = [float(0)]*24
        return list(response.values())
    else:
        return get_pollutants(station)
