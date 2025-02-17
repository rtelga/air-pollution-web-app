import React, { useEffect, useRef, useState } from 'react';
import * as Plot from "@observablehq/plot";

import InteractiveMap from './InteractiveMap.js';
import { infoPollutants } from './infoPollutants.js';


function PollutantSelection({listPollutants, callback, selectedPollutant}){
    return (
        <>
            { listPollutants.length > 1 && 
            <div style={{position: 'absolute', top: '400px'}}>
                {
                    listPollutants.map((p, i) => (
                        <div key={ i }>
                            <input
                                type="radio"
                                value={ p }
                                checked={ p === selectedPollutant }
                                onChange= { callback } />
                            { infoPollutants.get(p).name+" ("+p+")" }
                        </div>
                    ))
                }
            </div>
            }
        </>
    );
}

function DataVisualization({station, monitoredPollutants}){
    const containerRefA = useRef();
    const containerRefB = useRef();
    const [data, setData] = useState();
    const [i, setIndex] = useState(0);
    const [quit, setQuit] = useState(false);
    const [pollutant, setPollutant] = useState(monitoredPollutants[0]);
    const infoRef = useRef();
    const labelRef = useRef();
    
    useEffect(() => {
        let ignore = false;
        setData(null);
        fetch(`http://localhost:8000/data?station=${station}&pollutant=${pollutant}`)
        .then(response => response.json())
        .then(data => {
            if (!ignore) {
                setIndex(0);
                setData(data);
            }
        });
        infoRef.current = infoPollutants.get(pollutant);
        labelRef.current = `Niveaux moyens de concentration de ${pollutant} enregistrée sur 24 heures`;
        return () => {
            ignore = true;
        }
    }, [pollutant]);

    useEffect(() => {
        let plot, legendA, legendB;
        if (data) {
            if (!data[i].length || data[i].includes(-1)) {
                plot = document.createElement("div");
                if (!data[i].length) {
                    plot.append("Désolé, aucune données enregistrées pour cette journée !");
                } else {
                    plot.append("Désolé, l'enregistrement des données correspondant à cette journée est incomplet !");
                }
            } else {
                const scale = infoRef.current.colorScale;
                const plotValues = data[i].map((v, k) => {
                    const xLabel = `${k<=9 ? 0 : ""}${k}h`;
                    if (pollutant !== "CO") {
                        return {"": xLabel, "Concentration (µg/m³)": v};
                    } else {
                        return {"": xLabel, "Concentration (mg/m³)": v};
                    }
                });
                const dailyAverage = (data[i].reduce((a, b) => a+b)/24).toFixed(2);
                const yName = Object.keys(plotValues[0])[1];
                plot = Plot.plot({
                    width: 700,
                    marginBottom: 67,
                    marks: [
                        Plot.ruleY([0]),
                        Plot.areaY(plotValues, {x: "", y: yName, fill: scale.apply(dailyAverage)}),
                        Plot.lineY(plotValues, {x: "", y: yName})
                    ]
                });
                const g = infoRef.current.guideline;
                let tickLocations;
                tickLocations = [0.25, 0.5, 0.75, 1];
                legendA = Plot.legend({
                    width: 700,
                    color: {type: "sequential"},
                    ticks: tickLocations,
                    tickFormat: (v) => {
                        const m = new Map([
                            [0.25, 0],
                            [0.5, 0.33],
                            [0.75, 2/3],
                            [1, 1]
                        ]);
                        const u = infoRef.current.unit;
                        if ([0.25, 0.5, 1].includes(v)) {
                            return `${v===1 ? ">" : ""}${(m.get(v)*1.5*g).toFixed(2)} ${u}`;
                        } else {
                            return `|\n|\n|\n|\n Maximum \n recommandé (O.M.S) : \n ${g} ${u}`;
                        }
                    },
                    marginLeft: 70,
                    label: `                                                            ${labelRef.current}`
                });
                const x = 0.25+0.75*(dailyAverage/(1.5*g));
                tickLocations = [0.25, x, 0.5, 0.75, 1].sort();
                legendB = Plot.legend({
                    width: 700,
                    color: {type: "sequential"},
                    ticks: tickLocations,
                    tickFormat: (v) => {
                        if (v === x) {
                            const u = infoRef.current.unit;
                            return `|\n|\n|\n|\n Moyenne \n enregistrée : \n ${dailyAverage} ${u}`;
                        } else {
                            return '';
                        }
                    },
                    marginLeft: 70,
                });
            }
            containerRefA.current.append(plot);
            if (legendA) {
                containerRefA.current.append(legendA);
                containerRefB.current.append(legendB);
            }
        }

        return () => {
            if (plot) {
                plot.remove();
                if (legendA) {
                    legendA.remove();
                    legendB.remove();
                }
            }
        };
    }, [data, i]);

    return (
        <>
        {
        ! quit &&
        <div>
            <div>
                {
                i < 13 &&
                <button 
                    onClick={() => {setIndex(i+1)}}
                    style={{position: 'absolute', top: '40px', left: '40px'}} >
                    Journée précédente
                </button>
                }
                {
                i > 0 && 
                <button 
                    onClick={() => {setIndex(i-1)}}
                    style={{position: 'absolute', top: '40px', left:'470px'}} >
                    Journée suivante
                </button>
                }
                <div 
                    ref={containerRefA}
                    style={{position: 'relative', left: '700px'}}
                />
                <div
                    ref={containerRefB}
                    style={{position: 'relative', left: '700px', top: '87px'}}
                />
            </div>
            <PollutantSelection 
                listPollutants={monitoredPollutants}
                callback={(e) => setPollutant(e.target.value)} 
                selectedPollutant={pollutant} />
            <button
                onClick={() => {setQuit(true)}}
                style={{position: 'absolute', top: '770px'}} >
                Retour à la carte
            </button>
        </div>
        }
        {
        quit &&
        <InteractiveMap />
        }
        </>
    );
}

export default DataVisualization;
