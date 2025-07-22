// app.WorldEnvironmentSetData
const worldData = {
  SplitCountX: 64,
  SplitCountY: 64,
  Offset: { x: -4096, y: 0, z: -4096},
  SplitSize: { x: 128, y: 128, z: 128 }
};

const worldSizeX = worldData.SplitSize.x * worldData.SplitCountX;
const worldSizeY = worldData.SplitSize.z * worldData.SplitCountY;

// we have 5 columns and 6 rows of top level images
const imageSize = 1024;
const sizeX = imageSize * 5;
const sizeY = imageSize * 6;
const xmin = -sizeX / 2;
const ymin = -sizeY / 2;
const xmax = sizeX / 2;
const ymax = sizeY / 2;

const extent = [xmin, ymin, xmax, ymax];

const grid = new ol.tilegrid.TileGrid({
  minZoom: 0,
  maxZoom: 0,
  origin: [0, 0],
  resolutions: [1],
  tileSize: [1024, 1024],
  extent: [
    -imageSize * 3,
    -imageSize * 3,
    +imageSize * 2,
    +imageSize * 3
  ],
});

const gridLines = new ol.source.VectorTile({});

const envLines = new ol.layer.Vector({});

const projection = new ol.proj.Projection({
  code: 'pixel-map',
  units: 'pixels',
  extent,
});

function jsonToStyle(data) {
  const fill = data.fillColor && new ol.style.Fill({color: data.fillColor}) || undefined;
  const stroke = data.strokeColor && new ol.style.Stroke({color: data.strokeColor}) || undefined;
  if (data.type === 'circle') {
    return new ol.style.Style({
      image: new ol.style.Circle({
        radius: data.radius,
        fill,
      }),
      fill,
      stroke,
    });
  }
  if (data.type === 'fill') {
    return new ol.style.Style({
      fill,
      stroke,
    });
  }
}

function jsonToFeature(feature) {
  if (feature.type === 'point') {
    return new ol.Feature({ geometry: new ol.geom.Point([feature.position[0], -feature.position[1]]) })
  }
  if (feature.type === 'line') {
    return new ol.Feature({ geometry: new ol.geom.LineString([feature.from, feature.to]) })
  }
}

function createVectorLayerFromContent(content) {
  const style = jsonToStyle(content.style);
  const layer = new ol.layer.Vector({ style });

  if (content.type === 'grid') {
    const source = new ol.source.Vector({
      features: generateGridLines(content.splitX, content.splitY).map(jsonToFeature)
    });
    layer.setSource(source);
  } else if (content.type === 'featurelist') {
    const source = new ol.source.Vector({
      features: content.features.map(jsonToFeature).filter(x => !!x)
    });
    layer.setSource(source);
  }
  return layer;
}

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.TileImage({
        tileLoadFunction: (image, src) => {
          const [src_x, src_y, z] = src.split(' ').map(n => parseInt(n, 10));
          const x = src_x + 3;
          const y = src_y + 4;

          if (x < 0 || y < 0 || x >= 5 || y > 6) {console.log('skipping', x, y, z); return;}
          let id = (8 * y + x + 1);
          if (id < 10) id = '0' + id;
          image.getImage().src = `images/base/0/00${id}_im.jpg`;
        },
        url: '{x} {y} {z}',
        wrapX: false,
        tileGrid: grid,
      }),
    }),
  ],
  view: new ol.View({
    center: [0, 0],
    zoom: 2,
    projection,
  }),
});

const state = {
  mouse: { x: 0, y: 0 }
};

map.on('pointermove', (evt) => {
  state.mouse.x = evt.coordinate[0];
  state.mouse.y = evt.coordinate[1];
});

fetch('data/contents.json').then(res => res.json()).then(async contents => {
  const contentItems = await Promise.all(contents.map(info =>
    info.url ? fetch(info.url).then(res => res.json())
    : Promise.resolve(info.data)
  ));
  for (const content of contentItems) {
    map.addLayer(createVectorLayerFromContent(content));
  }
});

function coordToGridId(splitX, splitY, rowCount, coords) {
  const x = Math.floor((coords.x + worldSizeX / 2 - worldData.Offset.x) / splitX) - rowCount / 2;
  const y = Math.floor((-coords.y + worldSizeY / 2 - worldData.Offset.y) / splitY);
  return y * rowCount + x;
}

function coordToGridId2(splitX, splitY, rowCount, coords) {
  const x = Math.floor((coords.x - worldData.Offset.x) / splitX);
  const y = Math.floor((-coords.y - worldData.Offset.y) / splitY);
  return y * rowCount + x;
}

const infoContainer = document.querySelector('#hover-info');
const coordX = infoContainer.querySelector('#coords-x');
const coordY = infoContainer.querySelector('#coords-y');
const fieldId = infoContainer.querySelector('#field-id');
const envId = infoContainer.querySelector('#env-id');
const cellId = infoContainer.querySelector('#cell-id');
/** @type HTMLTextAreaElement */
const contentInput = document.querySelector('#custom-content-input');
function update() {
  coordX.innerHTML = state.mouse.x;
  coordY.innerHTML = -state.mouse.y;

  fieldId.innerHTML = coordToGridId(worldSizeX / 8, worldSizeY / 8, 8, state.mouse);
  envId.innerHTML = coordToGridId(worldSizeX / 64, worldSizeY / 64, 64, state.mouse);
  cellId.innerHTML = coordToGridId2(128 / 16, 128 / 16, 16, {x: (state.mouse.x + worldSizeX) % 128, y: (state.mouse.y + worldSizeX) % 128}) % 256;
  window.requestAnimationFrame(update);
}
contentInput.addEventListener('input', () => {
  try {
    const json = JSON.parse(contentInput.value);
    map.addLayer(createVectorLayerFromContent(json));
  } catch (e) {
    console.error('Invalid json ', e.message);
  }
})
window.requestAnimationFrame(update);
