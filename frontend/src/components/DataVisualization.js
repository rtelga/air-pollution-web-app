import axios from 'axios';
import React, { useState } from 'react';
import * as Plot from "@observablehq/plot";

import { infoPollutants } from './infoPollutants.js';


function PollutantSelection({listPollutants, callback}){
	if (listPollutants.length === 1){
		return null;
	}
	return listPollutants.map(p => {
		return (
			<>
				<label>
					<input
						type="radio"
						value={p}
						checked={this.state.selectedOption === listPollutants[0]}
						onChange={callback} />
				{infoPollutants.get(p).name+" ("+p+")"}
				</label>
			</>
		);
	});
}
function PlotComponent({...options}){
	return Plot.plot({...options});
}

function Legend({options}){
	return Plot.legend({...options});
}

function DataVisualization({station, monitoredPollutants}){
	const [pollutant, setPollutant] = useState(monitoredPollutants[0]);
	const [i, setIndex] = useState(0);
	const [data, setData] = useState(null);
	useEffect(() => {
		axios
		.get('http://localhost:8000/pollution', { params: {station: station, pollutant: pollutant}})
		.then(response => response.json())
		.then(data => setData(data))
		.catch(error => console.error(error));
	}, [pollutant]);
	let dailyData = data[i];
	let dailyAverage = dailyData.reduce((x, y) => x + y) / 24;
	let info = infoPollutants.get(p);
	// info.colorScale = Plot.scale({color: {domain: [0, x], range: [0.27, 1], clamp: true}})
    return (
		<>
			<PollutantSelection listPollutants={monitoredPollutants} callback={(e) => setPollutant(e.target.value)} />
			<button id="previous" onClick={() => setIndex(i+1)}>
				Journée précédente
			</button>
			<button id="next" onclick={() => setIndex(i-1)}>
				Journée suivante
			</button>
			<PlotComponent options={{
				marks: [
					Plot.ruleY([0]),
					Plot.areaY(dailyData, {x: "Hour", y: "Value", fill: info.colorScale.apply(dailyAverage)}),
					Plot.lineY(dailyData, {x: "Hour", y: "Value"})
				]
			}}/>
			<Legend options={{
				label: "Concentration atmosphérique moyenne de "+p+" sur 24 heures "+"("+info.unit+").",
				ticks: 4,
				tickFormat: (value, i) => i === 3 ? "> "+value : value,
				marginLeft: 70,
				width: 440
			}}/>
		</>
	);
}
		
export default DataVisualization;
