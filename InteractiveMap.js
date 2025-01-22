import React, { useState, useEffect, useRef } from 'react';

import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import TileLayer from 'ol/layer/Tile.js';
import Map from 'ol/Map.js';
import 'ol/ol.css';
import { fromLonLat } from 'ol/proj.js';
import OSM from 'ol/source/OSM.js';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import Overlay from 'ol/Overlay.js';
import VectorSource from 'ol/source/Vector.js';
import View from 'ol/View.js';

import DataVisualization from './DataVisualization.js';
import { geojsonData } from './departments.js';
import { stations } from './stations.js';

function InteractiveMap(){

    const [map, setMap] = useState();
    const [departmentLayer, setDepartmentLayer] = useState();
    const [stationLayer, setStationLayer] = useState();
    const [overlay, setOverlay] = useState();
    const [selectedStation, setSelectedStation] = useState();

    const mapElement = useRef();
    const tooltip = useRef();
    
    const mapRef = useRef();
    mapRef.current = map;

    const departmentLayerRef = useRef();
    departmentLayerRef.current = departmentLayer;
    
    const stationLayerRef = useRef();
    stationLayerRef.current = stationLayer;

    const overlayRef = useRef();
    overlayRef.current = overlay;

    const hoverCurrentDepartmentRef = useRef();
    const clickCurrentFeatureRef = useRef();
    const monitoredPollutantsRef = useRef();

    useEffect(() => {

        const initialDepartmentLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(
                    geojsonData,
                    {featureProjection: 'EPSG:3857'}
                )
            }),
            style: new Style({
                stroke: new Stroke({
                    color: [0, 0, 247, 1],
                    width: 0.7
                }),
                fill: new Fill({color: [217, 224, 247, 0.4]})
            })
        });
        
        const initialStationLayer = new VectorLayer({
            source: new VectorSource(),
            style: new Style({
                image: new Circle({
                    radius: 4,
                    fill: new Fill({
                        color: [184, 12, 240, 1]
                    })
                })
            })
        });
        const initialOverlay = new Overlay({
            element: tooltip.current,
            positioning: 'bottom-center'
        });
        const initialMap = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                initialDepartmentLayer
            ],
            overlays: [initialOverlay],
            view: new View({
                center: fromLonLat([0.75, 46.39]),
                zoom: 5.17
            }),
            controls: []
        });

        initialMap.on('pointermove', pointerMoveCallback);
        initialMap.on('click', clickCallback);
        
        setMap(initialMap);
        setDepartmentLayer(initialDepartmentLayer);
        setStationLayer(initialStationLayer);
        setOverlay(initialOverlay);
        
        return () => {
            initialMap.setTarget(null);
            setMap(null);
        }
    }, []);
    
    const pointerMoveCallback = (e) => {
        let text;
        const departmentStyle = departmentLayerRef.current.getStyle();
        const hightlightStyle = new Style({
            stroke: new Stroke({
                color: [0, 0, 247, 1],
                width: 4.4
            }),
            fill: departmentStyle.getFill()
        });
        const features = mapRef.current.getFeaturesAtPixel(e.pixel);
        if (features.length) {
            const feature = features[0];
            const properties = feature.getProperties();
            const featureIsAStation = 'name' in properties;
            mapRef.current.getTargetElement().style.cursor = featureIsAStation ? 'pointer' : 'default';
            if (! featureIsAStation) {
                if (feature!==hoverCurrentDepartmentRef.current) {
                    if (hoverCurrentDepartmentRef.current){
                        hoverCurrentDepartmentRef.current.setStyle(departmentStyle);
                    }
                    feature.setStyle(hightlightStyle);
                    hoverCurrentDepartmentRef.current = feature;
                }
                text = properties.nom+' ('+properties.code+')';
            } else {
                text = properties.name;
            }
            tooltip.current.textContent = text;
            overlayRef.current.setPosition([e.coordinate[0], e.coordinate[1]+7000]);
        } else {
            if (hoverCurrentDepartmentRef.current) {
                hoverCurrentDepartmentRef.current.setStyle(departmentStyle);
                hoverCurrentDepartmentRef.current = undefined;
            }
            overlayRef.current.setPosition(null);
            mapRef.current.getTargetElement().style.cursor = 'default';
        }
    };
        
    const deselectFeature = (feature) => {
        departmentLayerRef.current.getSource().addFeature(feature);
        stationLayerRef.current.getSource().clear();
        mapRef.current.removeLayer(stationLayerRef.current);

    };
    
    const clickCallback = (e) => {
        const features = mapRef.current.getFeaturesAtPixel(e.pixel);
        if (features.length) {
            const feature = features[0];
            const properties = feature.getProperties();
            if ('name' in properties) {
                const station = properties.code;
                fetch(`http://localhost:8000?station=${station}`)
                .then(response => response.json())
                .then(data => {
                    monitoredPollutantsRef.current = data;
                    setSelectedStation(station);
                })
            } else {
                const currentCode = properties.code;
                if (!clickCurrentFeatureRef.current || (clickCurrentFeatureRef.current && clickCurrentFeatureRef.current !== feature)) {
                    if (clickCurrentFeatureRef.current && clickCurrentFeatureRef.current !== feature) {
                        deselectFeature(clickCurrentFeatureRef.current);
                    }
                    departmentLayerRef.current.getSource().removeFeature(feature);
                    const x = ['09', '11', '46', '48'];
                    if (! x.includes(currentCode)) {
                        const markers = stations[currentCode].map(
                            station => new Feature({
                                geometry: new Point(fromLonLat(station.coordinates)),
                                name: station.name,
                                code: station.code,
                                pollutants: station.pollutants
                            })
                        );
                        stationLayerRef.current.getSource().addFeatures(markers);
                        mapRef.current.addLayer(stationLayerRef.current);
                    }
                    mapRef.current.getView().fit(feature.getGeometry(), {duration: 700});
                    clickCurrentFeatureRef.current = feature;
                }
            } 
        } else {
            if (clickCurrentFeatureRef.current) {
                deselectFeature(clickCurrentFeatureRef.current);
                clickCurrentFeatureRef.current = undefined;
            }
        }
    }
    
    return (
        <>
            {
            !selectedStation &&
            <div ref={mapElement} style={{position: 'absolute', top: '0', bottom: '0', height: '70%', width: '100%'}}>
                <div ref={tooltip} style={{backgroundColor: '#000000' , color: '#FFFFFF'}}></div>
            </div>}
            {
            selectedStation && 
            <DataVisualization
                station={selectedStation}
                monitoredPollutants={monitoredPollutantsRef.current}/>
            }
        </>
    );
}

export default InteractiveMap;
