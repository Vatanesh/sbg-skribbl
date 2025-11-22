
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';

interface BrushControlsProps {
  roomId: string;
  isDrawer?: boolean;
}

function BrushControls({ roomId, isDrawer = false }: BrushControlsProps) {
  const brush = useGameStore(state => state.brush);
  const setBrush = useGameStore(state => state.setBrush);
  const undo = useGameStore(state => state.undo);
  const clear = useGameStore(state => state.clearStrokes);


  const handleUndo = () => {
    if (!isDrawer) return;
    const last = useGameStore.getState().strokes.slice(-1)[0];
    if (last) {
      socket.emit('undo', { roomId, strokeId: last.id });
      undo();
    }
  };

  const handleClear = () => {
    if (!isDrawer) return;
    if (confirm('Are you sure you want to clear the entire drawing?')) {
      socket.emit('clear', { roomId });
      clear();
    }
  };

  const hasStrokes = useGameStore(state => state.strokes.length > 0);

  return (
    <div className={`brush-controls ${!isDrawer ? 'disabled' : ''}`}>
      <div className="brush-group">
        <label htmlFor="colorPicker">Stroke:</label>
        <input
          id="colorPicker"
          type="color"
          value={brush.color}
          onChange={e => setBrush({ ...brush, color: e.target.value })}
          disabled={!isDrawer}
        />
      </div>
      <div className="brush-group">
        <label htmlFor="fillColorPicker">Fill:</label>
        <input
          id="fillColorPicker"
          type="color"
          value={brush.fillColor}
          onChange={e => setBrush({ ...brush, fillColor: e.target.value })}
          disabled={!isDrawer}
        />
      </div>
      <div className="brush-group">
        <label htmlFor="modeSelect">Mode:</label>
        <select
          id="modeSelect"
          value={brush.mode}
          onChange={e => setBrush({ ...brush, mode: e.target.value as any })}
          disabled={!isDrawer}
          style={{
            padding: '4px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
            background: 'white'
          }}
        >
          <option value="stroke">Stroke Only</option>
          <option value="fill">Paint</option>
          <option value="both">Stroke + Fill</option>
        </select>
      </div>
      <div className="brush-group">
        <label htmlFor="sizeSlider">Size: {brush.size}px</label>
        <input
          id="sizeSlider"
          type="range"
          min="1"
          max="20"
          value={brush.size}
          onChange={e => setBrush({ ...brush, size: +e.target.value })}
          disabled={!isDrawer}
        />
      </div>
      <div className="brush-actions">
        <button
          onClick={handleUndo}
          disabled={!isDrawer || !hasStrokes}
          title={!isDrawer ? 'Only the drawer can undo' : !hasStrokes ? 'Nothing to undo' : 'Undo last stroke'}
        >
          ↶ Undo
        </button>
        <button
          onClick={handleClear}
          disabled={!isDrawer || !hasStrokes}
          title={!isDrawer ? 'Only the drawer can clear' : !hasStrokes ? 'Nothing to clear' : 'Clear all strokes'}
        >
          🗑️ Clear
        </button>
      </div>
      {!isDrawer && (
        <div className="permission-notice">
          ⏳ Waiting for your turn to draw
        </div>
      )}
    </div>
  );
}

export default BrushControls;