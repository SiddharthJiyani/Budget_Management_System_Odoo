import { Users, Package, BarChart3, Workflow, Wallet } from 'lucide-react';
import { Card } from '../ui';

const masterTypes = [
  {
    id: 'contact',
    label: 'Contact Master',
    description: 'Manage contacts, customers, and vendors',
    icon: Users,
    color: 'bg-primary',
  },
  {
    id: 'product',
    label: 'Product Master',
    description: 'Manage products, items, and services',
    icon: Package,
    color: 'bg-success',
  },
  {
    id: 'analytical',
    label: 'Analytics Master',
    description: 'Manage analytics entities for campaigns and events',
    icon: BarChart3,
    color: 'bg-accent',
  },
  {
    id: 'auto-analytical',
    label: 'Auto Analytical Model',
    description: 'Configure automatic analytical distributions',
    icon: Workflow,
    color: 'bg-secondary',
  },
  {
    id: 'budget',
    label: 'Budget Master',
    description: 'Manage budget plans and allocations',
    icon: Wallet,
    color: 'bg-primary',
  },
];

export default function MasterDataSelector({ onSelect }) {
  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">Master Data Management</h1>
        <p className="text-muted-foreground text-lg">Select a master data type to manage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {masterTypes.map((master) => (
          <button
            key={master.id}
            onClick={() => onSelect(master.id)}
            className="text-left group"
          >
            <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className={`w-14 h-14 ${master.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <master.icon className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {master.label}
              </h3>
              <p className="text-muted-foreground text-sm">
                {master.description}
              </p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
