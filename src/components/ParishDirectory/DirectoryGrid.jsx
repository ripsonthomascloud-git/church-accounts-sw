import FamilyCard from './FamilyCard';

const DirectoryGrid = ({ families, onViewDetails, onEdit, onDelete, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading families...</div>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📖</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Families Found</h3>
        <p className="text-gray-500">
          Import families from CSV to get started or add them manually.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {families.map((family) => (
        <FamilyCard
          key={family.id}
          family={family}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default DirectoryGrid;
