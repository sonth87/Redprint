import React from "react";
import { Toggle, Tooltip, TooltipContent, TooltipTrigger } from "@ui-builder/ui";
import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export interface ToolbarToggleProps extends HTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  tooltip: string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  size?: "sm" | "default" | "lg";
}

/**
 * ToolbarToggle — reusable toggle for toolbar with icon + tooltip
 */
export const ToolbarToggle = React.forwardRef<HTMLButtonElement, ToolbarToggleProps>(
  (
    {
      icon: Icon,
      tooltip,
      tooltipSide = "bottom",
      pressed,
      onPressedChange,
      size = "sm",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            ref={ref}
            size={size}
            pressed={pressed}
            onPressedChange={onPressedChange}
            className={className}
            {...props}
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
);

ToolbarToggle.displayName = "ToolbarToggle";
