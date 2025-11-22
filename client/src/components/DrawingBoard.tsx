import React, { useRef, useState, useEffect } from 'react';
import { useGameStore, Stroke, Point } from '../store/gameStore';
import { socket } from '../socket';

interface DrawingBoardProps {
  roomId: string;
  isDrawer?: boolean;
}

// Component for individual strokes
const StrokePath = ({ stroke }: { stroke: Stroke }) => {
  const toPath = (points: Point[]) => {
    if (!points || points.length === 0) return '';
    return points.map((p, i) => (i === 0 ? `M ${p[0] * 100} ${p[1] * 100}` : `L ${p[0] * 100} ${p[1] * 100}`)).join(' ');
  };

  const strokeColor = stroke.mode === 'fill' ? 'none' : stroke.color;
  const fillColor = stroke.mode === 'stroke' ? 'none' : stroke.fillColor;

  return (
    <path
      d={toPath(stroke.points)}
      stroke={strokeColor}
      strokeWidth={stroke.size / 5}
      fill={fillColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
};

// Component for the static layer of strokes
const StaticStrokes = ({ strokes }: { strokes: Stroke[] }) => {
  return (
    <>
      {strokes.map(s => (
        <StrokePath
          key={s.id}
          stroke={s}
        />
      ))}
    </>
  );
};

function DrawingBoard({ roomId, isDrawer = false }: DrawingBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const strokes = useGameStore(state => state.strokes);
  const addStroke = useGameStore(state => state.addStroke);
  const updateStroke = useGameStore(state => state.updateStroke);
  const brush = useGameStore(state => state.brush);
  const canDraw = useGameStore(state => state.canDraw);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [showPermissionMessage, setShowPermissionMessage] = useState(false);

  useEffect(() => {
    // Update drawing permissions
    useGameStore.getState().setCanDraw(isDrawer);
  }, [isDrawer]);

  useEffect(() => {
    console.log('DrawingBoard: Setting up socket listeners');
    socket.on('stroke', (stroke: Stroke) => {
      console.log('DrawingBoard: Received stroke', stroke.id);
      addStroke(stroke);
    });
    socket.on('undo', ({ strokeId }: { strokeId: string }) => {
      useGameStore.getState().removeStrokeById(strokeId);
    });
    socket.on('stroke:update', (stroke: Stroke) => {
      updateStroke(stroke);
    });

    return () => {
      console.log('DrawingBoard: Cleaning up socket listeners');
      socket.off('stroke');
      socket.off('stroke:update');
      socket.off('undo');
    };
  }, [addStroke, updateStroke]);

  console.log('DrawingBoard: Rendered with strokes:', strokes.length);

  const getNorm = (clientPoint: { clientX: number; clientY: number }): Point => {
    if (!svgRef.current) return [0, 0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientPoint.clientX - rect.left) / rect.width;
    const y = (clientPoint.clientY - rect.top) / rect.height;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  };

  const showNoDrawMessage = () => {
    setShowPermissionMessage(true);
    setTimeout(() => setShowPermissionMessage(false), 2000);
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to stop scrolling on touch devices
    // e.preventDefault() is not always safe on passive listeners, but here it's React synthetic event
    // However, for touchstart it might be passive.
    // React handles this usually.

    if (!canDraw || !isDrawer) {
      showNoDrawMessage();
      return;
    }



    setDrawing(true);
    let clientPoint;
    if ('touches' in e) {
      clientPoint = e.touches[0];
    } else {
      clientPoint = e;
    }

    const p = getNorm(clientPoint);
    const s: Stroke = {
      id: crypto.randomUUID(),
      color: brush.color,
      fillColor: brush.fillColor,
      size: brush.size,
      mode: brush.mode,
      points: [p]
    };
    setCurrent(s);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !canDraw || !isDrawer) return;

    let clientPoint;
    if ('touches' in e) {
      clientPoint = e.touches[0];
    } else {
      clientPoint = e;
    }

    const p = getNorm(clientPoint);
    setCurrent(s => s ? ({ ...s, points: [...s.points, p] }) : null);
  };

  const end = () => {
    if (!drawing || !current || !canDraw || !isDrawer) return;
    setDrawing(false);
    addStroke(current);
    socket.emit('stroke', { roomId, stroke: current });
    setCurrent(null);
  };



  // helper to convert normalized points to path d (percent)
  const toPath = (points: Point[]) => {
    if (!points || points.length === 0) return '';
    return points.map((p, i) => (i === 0 ? `M ${p[0] * 100} ${p[1] * 100}` : `L ${p[0] * 100} ${p[1] * 100}`)).join(' ');
  };

  return (
    <div className="svg-container" style={{ width: '100%', height: '60vh' }}>
      {showPermissionMessage && (
        <div className="permission-message">
          Only the drawer can draw!
        </div>
      )}

      <svg
        ref={svgRef}
        className="svg-board"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={{ touchAction: 'none' }}
      >
        <StaticStrokes
          strokes={strokes}
        />
        {current && (() => {
          const strokeColor = current.mode === 'fill' ? 'none' : current.color;
          const fillColor = current.mode === 'stroke' ? 'none' : current.fillColor;

          return (
            <path
              d={toPath(current.points)}
              stroke={strokeColor}
              strokeWidth={current.size / 5}
              fill={fillColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })()}
      </svg>
    </div>
  );
}

export default DrawingBoard;
