import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Palette } from "lucide-react";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  parent_id: string | null;
};

type CategoryFormProps = {
  categories: Category[];
  editingCategory?: Category;
  onSubmit: (category: {
    name: string;
    color: string;
    icon: string;
    parent_id: string | null;
  }) => void;
  onClose: () => void;
};

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#6b7280"
];

const PRESET_ICONS = [
  "utensils", "car", "shopping-bag", "film", "zap", "heart",
  "dollar-sign", "more-horizontal", "home", "briefcase", "plane",
  "coffee", "book", "music", "camera", "gamepad-2", "palette", "wrench"
];

const CategoryForm = ({ categories, editingCategory, onSubmit, onClose }: CategoryFormProps) => {
  const [name, setName] = useState(editingCategory?.name || "");
  const [color, setColor] = useState(editingCategory?.color || "#3b82f6");
  const [icon, setIcon] = useState(editingCategory?.icon || "folder");
  const [parentId, setParentId] = useState<string>(editingCategory?.parent_id || "");

  // Get only root categories for parent selection (no nested sub-categories)
  const rootCategories = categories.filter(cat => !cat.parent_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      color,
      icon,
      parent_id: parentId || null,
    });

    // Reset form
    setName("");
    setColor("#3b82f6");
    setIcon("folder");
    setParentId("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category (Optional)</Label>
              <Select value={parentId || "none"} onValueChange={(value) => setParentId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Category)</SelectItem>
                  {rootCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === presetColor ? 'border-foreground' : 'border-muted'
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Palette className="h-4 w-4" />
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-8 p-0 border-0"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_ICONS.map((iconName) => (
                    <SelectItem key={iconName} value={iconName}>
                      {iconName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 pt-4 sm:flex-row">
              <Button type="submit" className="flex-1 order-2 sm:order-1">
                {editingCategory ? 'Update Category' : 'Add Category'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="order-1 sm:order-2">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryForm;