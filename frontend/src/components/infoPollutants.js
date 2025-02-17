import { scale } from '@observablehq/plot';

export const infoPollutants = new Map([

    [
        "PM2.5",
        {
            name: "Particules fines",
            guideline: 15,
            unit: "µg/m³",
            colorScale: scale({color: {domain: [-0.33*15, 1.5*15], clamp: true}})
        }
    ],
    [
        "PM10",
        {
            name: "Particules",
            guideline: 45,
            unit: "µg/m³",
            colorScale: scale({color: {domain: [-0.33*45, 1.5*45], clamp: true}})
        }
    ],
    [
        "NO2",
        {
            name: "Dioxide d'azote",
            guideline: 25,
            unit: "µg/m³",
            colorScale: scale({color: {domain: [-0.33*25, 1.5*25], clamp: true}})
        }
    ],
    [
        "SO2",
        {
            name: "Dioxide de soufre",
            guideline: 40,
            unit: "µg/m³",
            colorScale: scale({color: {domain: [-0.33*40, 1.5*40], clamp: true}})
        }
    ],
    [
        "CO",
        {
            name: "Monoxide de carbone",
            guideline: 4,
            unit: "mg/m³",
            colorScale: scale({color: {domain: [-0.33*4, 1.5*4], clamp: true}})
        }
    ]
]);
