
function generateGridLines(countX, countY) {
  const lines = [];
  const stepX = worldSizeX / countX;
  const stepY = worldSizeY / countY;
  for (let y = 0; y <= countY; ++y) {
    lines.push({ type: 'line', from: [worldData.Offset.x, worldData.Offset.z + y * stepY], to: [worldData.Offset.x + worldSizeX, worldData.Offset.z + y * stepY] });
  }
  for (let x = 0; x <= countX; ++x) {
    lines.push({ type: 'line', from: [worldData.Offset.x + x * stepX, worldData.Offset.z], to: [worldData.Offset.x + x * stepX, worldData.Offset.z + worldSizeX] });
  }
  return lines;
}
