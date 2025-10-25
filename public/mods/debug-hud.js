// Debug HUD Layout Manager
// Logs what elements are registered and their positions

setTimeout(() => {
  if (!window.HUDLayoutManager) {
    console.error('❌ HUD Layout Manager not found!');
    return;
  }

  // Enable debug visualization
  window.HUDLayoutManager.enableDebug();

  // Log registered elements every 3 seconds
  setInterval(() => {
    console.log('=== HUD Layout Manager Elements ===');
    console.table(
      Array.from(HUDLayoutManager.elements.entries()).map(([id, elem]) => ({
        ID: id,
        Position: elem.position,
        Priority: elem.priority,
        Width: elem.width,
        Height: elem.height,
        X: Math.round(elem.actualX),
        Y: Math.round(elem.actualY)
      }))
    );
  }, 3000);

  console.log('✅ HUD Debug loaded - showing bounding boxes and logging positions');
}, 300);
