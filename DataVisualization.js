import React, { useEffect, useRef, useState } from 'react';
import * as Plot from "@observablehq/plot";

import { infoPollutants } from './infoPollutants.js';


function PollutantSelection({listPollutants, callback}){
    return (
        <>
            { listPollutants.length > 1 && 
            <div>
                {
                    listPollutants.map((p, i) => (
                        <span key={ i }>
                            <input
                                type="radio"
                                value={ p }
                                checked={ p === listPollutants[0] }
                                onChange={callback} />
                            { infoPollutants.get(p).name+" ("+p+")" }
                        </span>
                    ))
                }
            </div>
            }
        </>
    );
}

function DataVisualization({station, monitoredPollutants}){
    const containerRef = useRef();
    const [data, setData] = useState();
    const [i, setIndex] = useState();
    const [pollutant, setPollutant] = useState(monitoredPollutants[0]);
    const infoRef = useRef();
    const labelRef = useRef();
    
    useEffect(() => {
        let ignore = false;
        setData(null);
        fetch(`http://localhost:8000?station=${station}&pollutant=${pollutant}`)
        .then(response => response.json())
        .then(data => {
            if (!ignore) {
                setData(data);
                setIndex(0);
            }
        });
        infoRef.current = infoPollutants.get(pollutant);
        labelRef.current = `Concentration atmosphérique moyenne de ${pollutant} sur 24 heures (${infoRef.current.unit})`;
        return () => {
            ignore = true;
        }
    }, [pollutant]);

    useEffect(() => {
        let plot, legend;
        if (!data) {
            plot = document.createElement("div");
            plot.append("Aucune donnée");
        } else {
            plot = Plot.plot({
                marks: [
                    Plot.ruleY([0]),
                    Plot.areaY(data[i], {x: "Hour", y: "Value", fill: infoRef.current.colorScale.apply(data[i].reduce((x, y) => x + y)) / 24}),
                    Plot.lineY(data[i], {x: "Hour", y: "Value"})
                ]
            });
            legend = Plot.legend({
                width: 440,
                color: {type: "linear"},
                ticks: 4,
                tickFormat: (value, k) => k === 3 ? "> "+value : value,
                marginLeft: 70,
                label: labelRef.current
            });
        }
        containerRef.current.append(plot);
        if (legend) 
            containerRef.current.append(legend);
        
    return () => {
        plot.remove();
        if (legend) 
            legend.remove();
        }
    }, [data, i]);

    return (
        <div>
            {
            i < 14 &&
            <button 
                onClick={() => setIndex(i+1)} 
                style={{position: 'absolute', top: '40px', left: '40px'}} >
                Journée précédente
            </button>
            }
            {
            i > 0 && 
            <button 
                onClick={() => setIndex(i-1)} 
                style={{position: 'absolute', top: '40px', right: '40px'}} >
                Journée suivante
            </button>
            }
            <div 
                ref={containerRef} 
                style={{position: 'absolute', top: '50%', left: '50%'}} />
            <PollutantSelection 
                listPollutants={monitoredPollutants}
                callback={(e) => setPollutant(e.target.value)} />
        </div>
    );
}

export default DataVisualization;
