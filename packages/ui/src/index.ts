/**
 * @ui-builder/ui — public API
 *
 * shadcn-based design system for the UI Builder editor.
 * Import components individually to enable tree-shaking.
 *
 * @example
 * import { Button, Tooltip, TooltipProvider } from '@ui-builder/ui';
 */

// Utility
export { cn } from "./lib/utils";

// Components
export { Button, buttonVariants } from "./components/button";
export type { ButtonProps } from "./components/button";

export { Input } from "./components/input";
export type { InputProps } from "./components/input";

export { Label } from "./components/label";
export type { LabelProps } from "./components/label";

export { Separator } from "./components/separator";

export { Slider } from "./components/slider";

export { Switch } from "./components/switch";

export { Toggle, toggleVariants } from "./components/toggle";
export type { ToggleProps } from "./components/toggle";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./components/select";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/tabs";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./components/dropdown-menu";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/tooltip";

export { ScrollArea, ScrollBar } from "./components/scroll-area";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./components/popover";

export { Badge, badgeVariants } from "./components/badge";
export type { BadgeProps } from "./components/badge";
