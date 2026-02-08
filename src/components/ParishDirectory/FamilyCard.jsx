import { useState } from 'react';
import Button from '../common/Button';

const FamilyCard = ({ family, onViewDetails, onEdit, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const displayedMembers = showAllMembers ? family.members : family.members.slice(0, 3);
  const hasMoreMembers = family.members.length > 3;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Family Photo */}
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        {family.photoUrl && !imageError ? (
          <img
            src={family.photoUrl}
            alt={family.familyName}
            onError={handleImageError}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-6xl text-gray-400">👨‍👩‍👧‍👦</div>
        )}
      </div>

      {/* Family Info */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{family.familyName}</h3>

        {family.prayerGroup && (
          <p className="text-sm text-blue-600 font-medium mb-3">
            🙏 {family.prayerGroup}
          </p>
        )}

        <div className="space-y-1 text-sm text-gray-600 mb-3">
          {family.address && (
            <p className="flex items-start">
              <span className="mr-2">📍</span>
              <span>
                {family.address}
                {(family.city || family.state || family.zipCode) && (
                  <>
                    <br />
                    {[family.city, family.state, family.zipCode].filter(Boolean).join(', ')}
                  </>
                )}
              </span>
            </p>
          )}

          {family.homePhone && (
            <p>
              <span className="mr-2">📞</span>
              {family.homePhone}
            </p>
          )}

          {family.mobilePhone && (
            <p>
              <span className="mr-2">📱</span>
              {family.mobilePhone}
            </p>
          )}

          {family.email && (
            <p className="break-all">
              <span className="mr-2">📧</span>
              {family.email}
            </p>
          )}

          {family.homeParish && (
            <p>
              <span className="mr-2">⛪</span>
              {family.homeParish}
            </p>
          )}
        </div>

        {/* Members Section */}
        <div className="border-t pt-3 mt-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            👥 Family Members ({family.members.length})
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {displayedMembers.map((member, index) => (
              <li key={index} className="truncate">
                • {member.name}
                {member.isPrimary && <span className="text-xs text-blue-600 ml-1">(Head)</span>}
              </li>
            ))}
          </ul>

          {hasMoreMembers && !showAllMembers && (
            <button
              onClick={() => setShowAllMembers(true)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              + {family.members.length - 3} more members
            </button>
          )}

          {showAllMembers && hasMoreMembers && (
            <button
              onClick={() => setShowAllMembers(false)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              Show less
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-4">
          <Button
            onClick={() => onViewDetails(family)}
            variant="secondary"
            className="flex-1 text-sm py-2"
          >
            View Details
          </Button>
          <Button
            onClick={() => onEdit(family)}
            variant="secondary"
            className="flex-1 text-sm py-2"
          >
            Edit
          </Button>
          <Button
            onClick={() => onDelete(family)}
            variant="danger"
            className="text-sm py-2"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FamilyCard;
