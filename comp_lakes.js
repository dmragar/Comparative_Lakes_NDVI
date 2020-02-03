/**
 * Function to mask clouds based on the pixel_qa band of Landsat 8 SR data.
 * @param {ee.Image} image input Landsat 8 SR image
 * @return {ee.Image} cloudmasked Landsat 8 image
 */
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);
  var WaterBitMask = (1 << 2);
  var SnowBitMask = (1 << 4);
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0))
                 .and(qa.bitwiseAnd(WaterBitMask).eq(0))
                 .and(qa.bitwiseAnd(SnowBitMask).eq(0));
  return image.updateMask(mask);
}

var collection = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
                  .filterBounds(ee.Geometry.Point([-105.66, 39.97]))
                  .filterDate('2016-06-1', '2016-09-15')
                  .map(maskL8sr);


var visParams = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 3000,
  gamma: 1.4,
};
Map.setCenter(114.0079, -26.0765, 9);
Map.addLayer(collection.median(), visParams, 'SRmasked');


var unmasked = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
                  .filterBounds(ee.Geometry.Point([-105.66, 39.97]))
                  .filterDate('2016-06-1', '2016-09-15')
Map.addLayer(unmasked.median(), visParams, 'SR_unmasked');



//-----CREATE MEDIAN IMAGE--------------
// Median image
var scene = ee.Image(collection.median());
Map.addLayer(scene, {bands: ['B4', 'B3', 'B2'], max: 0.3}, 'median');


//----------NDVI-------------------------------

var ndvi = scene.normalizedDifference(['B5', 'B4']).rename('NDVI');
var ndviParams2 = {min: -1, max: 1, palette: ['blue', 'white', 'green']};
Map.addLayer(ndvi, ndviParams2, 'NDVI SR_product');

//NDVI MASK-------------------------------------
//var ndviMasked = ndvi.updateMask(ndvi.gte(0));
//var ndviParams = {min: -1, max: 1, palette: ['blue', 'white', 'green']};
//Map.addLayer(ndviMasked, ndviParams, 'NDVI Masked');



// Create two circular geometries.
var poly1 = ee.Geometry.Point([-105.6185272, 40.0693832]).buffer(700);

Map.addLayer(poly1, {color: 'FF0000'}, 'poly1');
Map.centerObject(poly1)

// Reduce the region. The region parameter is the Feature geometry.
var meanDictionary = ndvi.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: poly1,
  scale: 30,
  maxPixels: 1e9
});


print(meanDictionary);

// Print polygon area in square kilometers.
print('Polygon area: ', poly1.area().divide(1000 * 1000));


// Pre-define some customization options.
var options = {
  title: 'Histogram of NDVI values in polygon',
  fontSize: 20,
  hAxis: {title: 'DN'},
  vAxis: {title: 'count of DN'},
  series: {
    0: {color: 'blue'}},

};

// Make the histogram, set the options.
var histogram = ui.Chart.image.histogram(ndvi, poly1, 30)
    .setSeriesNames(['NDVI'])
    .setOptions(options);


print(histogram);
