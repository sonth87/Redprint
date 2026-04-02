import { useState, useEffect } from "react";


interface RotatingState {
  nodeId: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  initialRotation: number;
  gestureGroupId: string;
  hasExceededThreshold: boolean;
}

interface UseRotateGestureOptions {
  breakpoint: string;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
}

export interface UseRotateGestureReturn {
  rotating: RotatingState | null;
  setRotating: (state: RotatingState | null) => void;
  startRotate: (opts: {
    nodeId: string;
    clientX: number;
    clientY: number;
    elementRect: DOMRect;
    currentRotation: number;
    gestureGroupId: string;
  }) => void;
}

const ROTATION_THRESHOLD = 15;

export function useRotateGesture({ breakpoint, dispatch }: UseRotateGestureOptions): UseRotateGestureReturn {
  const [rotating, setRotating] = useState<RotatingState | null>(null);

  useEffect(() => {
    if (!rotating) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - rotating.centerX;
      const dy = e.clientY - rotating.centerY;
      const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      let angleDelta = currentAngle - rotating.startAngle;

      const isNear0Start =
        rotating.initialRotation === 0 ||
        Math.abs(rotating.initialRotation) < ROTATION_THRESHOLD ||
        Math.abs(rotating.initialRotation - 360) < ROTATION_THRESHOLD;
      if (isNear0Start) {
        angleDelta *= 0.25;
      }

      const calculatedRotation = Math.round(rotating.initialRotation + angleDelta);
      dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: rotating.nodeId,
          style: { transform: `rotate(${calculatedRotation}deg)` },
          breakpoint,
        },
        groupId: rotating.gestureGroupId,
        description: "Rotate",
      });
    };
    const handleGlobalMouseUp = () => setRotating(null);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [rotating, dispatch, breakpoint]);

  const startRotate = ({
    nodeId,
    clientX,
    clientY,
    elementRect,
    currentRotation,
    gestureGroupId,
  }: {
    nodeId: string;
    clientX: number;
    clientY: number;
    elementRect: DOMRect;
    currentRotation: number;
    gestureGroupId: string;
  }) => {
    const cxViewport = (elementRect.left + elementRect.right) / 2;
    const cyViewport = (elementRect.top + elementRect.bottom) / 2;
    const startAngle = (Math.atan2(clientY - cyViewport, clientX - cxViewport) * 180) / Math.PI;
    setRotating({
      nodeId,
      centerX: cxViewport,
      centerY: cyViewport,
      startAngle,
      initialRotation: currentRotation,
      gestureGroupId,
      hasExceededThreshold: false,
    });
  };

  return { rotating, setRotating, startRotate };
}
