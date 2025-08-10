import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type CategoryListProps = {
  categories: Category[];
};

const CategoryList = ({ categories }: CategoryListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent>
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
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryList;