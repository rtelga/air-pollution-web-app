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

function InteractiveMap(){

    const [map, setMap] = useState();
    const [departmentLayer, setDepartmentLayer] = useState();
    const [stationLayer, setStationLayer] = useState();
    const [departmentWithNoDataLayer, setDepartmentWithNoDataLayer] = useState();
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

    const departmentWithNoDataLayerRef = useRef();
    departmentWithNoDataLayerRef.current = departmentWithNoDataLayer;

    const overlayRef = useRef();
    overlayRef.current = overlay;

    const hoverCurrentDepartment = useRef();
    const clickCurrentFeature = useRef();
    const monitoredPollutants = useRef();
    const stationsBeingRetrieved = useRef();

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

        const initialDepartmentWithNoDataLayer = new VectorLayer({
            source: new VectorSource(),
            style: new Style({
                fill: new Fill({
                    color: [247, 0, 0, 0.7]
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
        setDepartmentWithNoDataLayer(initialDepartmentWithNoDataLayer);
        setOverlay(initialOverlay);
        
        return () => {
            initialMap.setTarget(null);
            setMap(null);
        }
    }, []);
    
    const pointerMoveCallback = (e) => {
        if (mapRef.current) {
            if (stationsBeingRetrieved.current) return;
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
                    if (feature!==hoverCurrentDepartment.current) {
                        if (hoverCurrentDepartment.current){
                            hoverCurrentDepartment.current.setStyle(departmentStyle);
                        }
                        feature.setStyle(hightlightStyle);
                        hoverCurrentDepartment.current = feature;
                    }
                    text = properties.nom+' ('+properties.code+')';
                } else {
                    text = properties.name;
                }
                tooltip.current.textContent = text;
                overlayRef.current.setPosition([e.coordinate[0], e.coordinate[1]+7000]);
            } else {
                if (hoverCurrentDepartment.current) {
                    hoverCurrentDepartment.current.setStyle(departmentStyle);
                    hoverCurrentDepartment.current = undefined;
                }
                overlayRef.current.setPosition(null);
                mapRef.current.getTargetElement().style.cursor = 'default';
            }
        }
    };
        
    const deselectFeature = (feature) => {
        departmentLayerRef.current.getSource().addFeature(feature);
        const layers = mapRef.current.getAllLayers();
        if (layers.includes(stationLayerRef.current)) {
            stationLayerRef.current.getSource().clear();
            mapRef.current.removeLayer(stationLayerRef.current);
        } else {
            departmentWithNoDataLayerRef.current.getSource().clear();
            mapRef.current.removeLayer(departmentWithNoDataLayerRef.current);
        }
    };

    const getStations = (department) => {
        return new Promise((resolve, reject) => {
            resolve(
                fetch(`http://localhost:8000/stations?department=${department}`)
                .then(response => response.json())
            );
        }
    )};
    
    const clickCallback = (e) => {
        const features = mapRef.current.getFeaturesAtPixel(e.pixel);
        if (features.length) {
            const feature = features[0];
            const properties = feature.getProperties();
            if ('name' in properties) {
                monitoredPollutants.current = properties.pollutants;
                setSelectedStation(properties.code);
            } else {
                const currentCode = properties.code;
                if (!clickCurrentFeature.current || (clickCurrentFeature.current && clickCurrentFeature.current !== feature)) {
                    if (clickCurrentFeature.current && clickCurrentFeature.current !== feature) {
                        deselectFeature(clickCurrentFeature.current);
                    }
                    departmentLayerRef.current.getSource().removeFeature(feature);
                    const x = ['09', '11', '46', '48'];
                    if (! x.includes(currentCode)) {
                        stationsBeingRetrieved.current = true;
                        mapRef.current.getTargetElement().style.cursor = 'wait';
                        getStations(currentCode)
                        .then((data) => {
                            if (data.length) {
                                const markers = data.map(
                                    (array) => new Feature({
                                        geometry: new Point(fromLonLat([array[0][2], array[0][1]])),
                                        code: array[0][3],
                                        name: array[0][4],
                                        pollutants: array[1]
                                    })
                                );
                                stationLayerRef.current.getSource().addFeatures(markers);
                                mapRef.current.addLayer(stationLayerRef.current);
                    
                                mapRef.current.getView().fit(feature.getGeometry(), {duration: 700});
                            }
                            else {
                                departmentWithNoDataLayerRef.current.getSource().addFeature(feature);
                                mapRef.current.addLayer(departmentWithNoDataLayerRef.current);
                            }
                        });
                    } else {
                        departmentWithNoDataLayerRef.current.getSource().addFeature(feature);
                        mapRef.current.addLayer(departmentWithNoDataLayerRef.current);
                    }
                    clickCurrentFeature.current = feature;
                    mapRef.current.getTargetElement().style.cursor = 'default';
                    stationsBeingRetrieved.current = false;
                }
            }
        } else {
            if (clickCurrentFeature.current) {
                deselectFeature(clickCurrentFeature.current);
                clickCurrentFeature.current = undefined;
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
                monitoredPollutants={monitoredPollutants.current} />
            }
        </>
    );
}

export default InteractiveMap;
