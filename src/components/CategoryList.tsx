import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Settings } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  parent_id: string | null;
};

type CategoryListProps = {
  categories: Category[];
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
};

const CategoryList = ({ categories, onAdd, onEdit, onDelete }: CategoryListProps) => {
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Organize categories into hierarchy for management section
  const rootCategories = categories.filter(cat => !cat.parent_id);
  const subCategories = categories.filter(cat => cat.parent_id);

  const getSubCategories = (parentId: string) => {
    return subCategories.filter(cat => cat.parent_id === parentId);
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const CategoryManagementItem = ({ category, isSubCategory = false }: { category: Category; isSubCategory?: boolean }) => {
    const subCats = getSubCategories(category.id);
    const hasSubCategories = subCats.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div className={`${isSubCategory ? 'ml-6' : ''}`}>
        <div className={`flex items-center justify-between p-3 border rounded-lg ${isSubCategory ? 'border-l-4 bg-muted/50' : ''}`} 
             style={isSubCategory ? { borderLeftColor: category.color } : {}}>
          <div className="flex items-center gap-3 flex-1">
            {hasSubCategories && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleExpanded(category.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            
            <Badge 
              variant="secondary" 
              className="flex items-center gap-2 px-3 py-1"
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </Badge>
            
            {subCats.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({subCats.length} sub-{subCats.length === 1 ? 'category' : 'categories'})
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(category)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(category.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {hasSubCategories && isExpanded && (
          <div className="mt-2 space-y-2">
            {subCats.map((subCat) => (
              <CategoryManagementItem 
                key={subCat.id} 
                category={subCat} 
                isSubCategory={true} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simple category display */}
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No categories yet. Manage categories below to get started!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge 
                key={category.id} 
                variant="secondary" 
                className="flex items-center gap-2 px-3 py-1"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
                {category.parent_id && (
                  <span className="text-xs opacity-60">
                    (sub)
                  </span>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Collapsible management section */}
        <Collapsible open={isManagementOpen} onOpenChange={setIsManagementOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manage Categories
              </div>
              {isManagementOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Management section with Add button always visible */}
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm text-muted-foreground">Category Management</h4>
                <Button size="sm" onClick={onAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Category</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
              
              {categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No categories to manage yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {rootCategories.map((category) => (
                    <CategoryManagementItem key={category.id} category={category} />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default CategoryList;