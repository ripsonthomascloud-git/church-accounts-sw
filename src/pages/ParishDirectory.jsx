import { useState, useMemo } from 'react';
import { useParishDirectory } from '../hooks/useParishDirectory';
import ImportParishDirectory from '../components/ParishDirectory/ImportParishDirectory';
import DirectoryGrid from '../components/ParishDirectory/DirectoryGrid';
import FamilyDetails from '../components/ParishDirectory/FamilyDetails';
import FamilyForm from '../components/ParishDirectory/FamilyForm';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const ParishDirectory = () => {
  const { families, loading, addFamily, updateFamily, deleteFamily } = useParishDirectory();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEmailListModal, setShowEmailListModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrayerGroup, setFilterPrayerGroup] = useState('');

  // Get unique prayer groups for filter
  const prayerGroups = useMemo(() => {
    const groups = new Set();
    families.forEach(family => {
      if (family.prayerGroup) {
        groups.add(family.prayerGroup);
      }
    });
    return Array.from(groups).sort();
  }, [families]);

  // Filter families based on search and prayer group
  const filteredFamilies = useMemo(() => {
    return families.filter(family => {
      // Search filter (family name, member names, prayer group)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        family.familyName.toLowerCase().includes(searchLower) ||
        (family.prayerGroup && family.prayerGroup.toLowerCase().includes(searchLower)) ||
        family.members.some(member => member.name.toLowerCase().includes(searchLower));

      // Prayer group filter
      const matchesPrayerGroup = filterPrayerGroup === '' ||
        family.prayerGroup === filterPrayerGroup;

      return matchesSearch && matchesPrayerGroup;
    });
  }, [families, searchTerm, filterPrayerGroup]);

  // Generate email list from all members
  const memberEmailList = useMemo(() => {
    const members = [];
    families.forEach(family => {
      family.members.forEach(member => {
        if (member.email) {
          members.push({
            name: member.name,
            email: member.email,
            familyName: family.familyName
          });
        }
      });
    });
    return members.sort((a, b) => a.name.localeCompare(b.name));
  }, [families]);

  const handleImportFamilies = async (familiesData) => {
    for (const familyData of familiesData) {
      await addFamily(familyData);
    }
    setShowImportModal(false);
  };

  const handleAddFamily = async (familyData) => {
    await addFamily(familyData);
    setShowAddModal(false);
  };

  const handleEditFamily = async (familyData) => {
    await updateFamily(selectedFamily.id, familyData);
    setShowEditModal(false);
    setSelectedFamily(null);
  };

  const handleDeleteFamily = async (family) => {
    if (window.confirm(`Are you sure you want to delete ${family.familyName}? This action cannot be undone.`)) {
      await deleteFamily(family.id);
    }
  };

  const handleViewDetails = (family) => {
    setSelectedFamily(family);
    setShowDetailsModal(true);
  };

  const handleEdit = (family) => {
    setSelectedFamily(family);
    setShowEditModal(true);
  };

  const handleDownloadEmailList = () => {
    // Create CSV content
    const csvContent = [
      ['Name', 'Email', 'Family Name'].join(','),
      ...memberEmailList.map(member =>
        [member.name, member.email, member.familyName].join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `parish_email_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Parish Directory</h1>
        <div className="flex space-x-3">
          <Button onClick={() => setShowEmailListModal(true)} variant="secondary">
            Email List
          </Button>
          <Button onClick={() => setShowImportModal(true)} variant="secondary">
            Import from CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)}>Add New Family</Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by family name, member name, or prayer group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={filterPrayerGroup}
            onChange={(e) => setFilterPrayerGroup(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Prayer Groups</option>
            {prayerGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Showing {filteredFamilies.length} of {families.length} families
        </div>
      )}

      {/* Directory Grid */}
      <DirectoryGrid
        families={filteredFamilies}
        loading={loading}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDeleteFamily}
      />

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Families from CSV"
        size="large"
      >
        <ImportParishDirectory
          onImport={handleImportFamilies}
          onCancel={() => setShowImportModal(false)}
        />
      </Modal>

      {/* Add Family Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Family"
        size="large"
      >
        <FamilyForm
          onSave={handleAddFamily}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Family Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedFamily(null);
        }}
        title="Edit Family"
        size="large"
      >
        {selectedFamily && (
          <FamilyForm
            family={selectedFamily}
            onSave={handleEditFamily}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedFamily(null);
            }}
          />
        )}
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedFamily(null);
        }}
        title="Family Details"
        size="large"
      >
        {selectedFamily && <FamilyDetails family={selectedFamily} />}
      </Modal>

      {/* Email List Modal */}
      <Modal
        isOpen={showEmailListModal}
        onClose={() => setShowEmailListModal(false)}
        title="Member Email List"
        size="large"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Total members with email: {memberEmailList.length}
            </p>
            <Button onClick={handleDownloadEmailList} variant="secondary">
              Download CSV
            </Button>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {memberEmailList.map((member, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.familyName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ParishDirectory;
