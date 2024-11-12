import React, { useEffect, useState } from 'react';

import DataVisualization from './components/DataVisualization.js';
import {createEmpty, extend} from 'ol/extent.js';
import TileLayer from 'ol/layer/Tile.js';
import { Map as OpenLayersMap } from 'ol/Map.js';
import { fromLonLat } from 'ol/proj.js';
import OSM from 'ol/source/OSM.js';
import View from 'ol/View.js';


function Map({view = 0}){

    const vector = new VectorLayer({
        source: new VectorSource({
            url: 'https://github.com/gregoiredavid/france-geojson/blob/master/departements-avec-outre-mer.geojson',
            format: new GeoJSON(),
            style: {

            }
        })
    });
    const firstView = new View({
        center: fromLonLat([46.49, 2.60]),
        zoom: x
    });
    const map = new OpenLayersMap({
        layers: [
            new TileLayer({
                source: new OSM(),
            }),
            vector
        ],
        target: 'map',
        view: firstView,
    });
    const departmentHightlightLayer = new VectorLayer({
        source: new VectorSource(),
        map: map,
        style: {
            'stroke-color': 'rgba(255, 255, 255, 0.7)',
            'stroke-width': 1.7
        }
    })
    const stationHightlightLayer = new VectorLayer({
        source: new VectorSource(),
        map: map,
        style: {'circle-fill-color': 'green'}
    })
    let departmentHightlight, stationHightlight;
    const hightlightFeature = function (hoverFeature, hightlight) {
        const layer = hoverFeature.getGeometry() instanceof Polygon
        ? departmentHightlightLayer
        : stationHightlightLayer;
        if (hoverFeature !== hightlight) {
            if (hightlight) {
                layer.getSource().removeFeature(hightlight);
            }
            if (hoverFeature) {
                layer.getSource().addFeature(hoverFeature);
            }
            hightlight = hoverFeature
        }
    }
    const displayFeatureInfo = function (pixel, target) {
        const feature = target.closest('.ol-control')
        ? undefined
        : map.forEachFeatureAtPixel(pixel, function (feature) {
            return feature;
        });
        const info = document.getElementById('info');
        if (feature) {
            info.style.left = pixel[0] + 'px';
            info.style.top = pixel[1] + 'px';
            info.style.visibility = 'visible';
            const properties = feature.getProperties();
            text = feature.getGeometry() instanceof Polygon
            ? properties.nom+' ('+properties.code+')'
            : properties.name+'\n'+properties.zoneType
            info.textContent = text;
        }
        hightlightFeature(
            feature,
            feature.getGeometry() instanceof Polygon ? departmentHightlight : stationHightlight
        );
    };
    map.on('pointermove', function (event) {
        if (event.dragging) {
            return;
        }
        const pixel = map.getEventPixel(event);
        displayFeatureInfo(pixel, event.target);
        map.getTargetElement().style.cursor = stationHightlight ? 'pointer' : '';
    });

    let currentFeature, displayedStations;
    map.on('click', (event) => {
        vector.getFeatures(event.pixel).then((features) => {
            if (features.length) {
                if (features[0].getGeometry() instanceof Point){
                    return <DataVisualization station={features[0].properties.code}/>;
                } else {
                    if (currentFeature && features[0] !== currentFeature){
                        currentFeature = features[0];
                        const department = currentFeature.properties.code;
                        displayedStations = axios.get(
                            `http://localhost/stations/${department}`
                        ).then(response => response.json());
                        const markers = displayedStations.map(
                            data => new Feature({
                                geometry: new Point(data.coordinates),
                                code: data.code,
                                name: data.name,
                                zoneType: data.zoneType
                            })
                        )
                        const extent = createEmpty();
                        displayedStations.forEach((feature) => extend(extent, feature.getGeometry().getExtent()));
                        map.getView().fit(extent, {duration: 700, padding: [70, 70, 70, 70]})
                        map.addLayer(
                            new VectorLayer({
                                features: markers,
                                style: {
                                    'circle-radius': 4,
                                    'circle-fill-color': 'red',
                                },
                            })
                        );
                    } else {
                        map.setView(firstView);
                        map.removeLayer(map.getAllLayers().at(2));
                    }
                }
            }
        })
    });
    return (
        <div id="map"></div>
    )
}
export default Map;
