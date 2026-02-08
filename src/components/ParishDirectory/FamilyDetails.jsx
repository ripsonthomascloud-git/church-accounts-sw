import { useState } from 'react';
import { formatDate, formatDateOfBirth } from '../../utils/dateUtils';

const FamilyDetails = ({ family }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="space-y-6">
      {/* Family Photo */}
      <div className="flex justify-center">
        <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          {family.photoUrl && !imageError ? (
            <img
              src={family.photoUrl}
              alt={family.familyName}
              onError={handleImageError}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-8xl text-gray-400">👨‍👩‍👧‍👦</div>
          )}
        </div>
      </div>

      {/* Family Information */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Family Information</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Family Name</p>
              <p className="text-base text-gray-900">{family.familyName}</p>
            </div>

            {family.prayerGroup && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Prayer Group</p>
                <p className="text-base text-gray-900">{family.prayerGroup}</p>
              </div>
            )}

            {family.homeParish && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Home Parish</p>
                <p className="text-base text-gray-900">{family.homeParish}</p>
              </div>
            )}
          </div>

          {family.address && (
            <div>
              <p className="text-sm font-semibold text-gray-600">Address</p>
              <p className="text-base text-gray-900">
                {family.address}
                {(family.city || family.state || family.zipCode) && (
                  <>
                    <br />
                    {[family.city, family.state, family.zipCode].filter(Boolean).join(', ')}
                  </>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {family.homePhone && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Home Phone</p>
                <p className="text-base text-gray-900">{family.homePhone}</p>
              </div>
            )}

            {family.mobilePhone && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Mobile Phone</p>
                <p className="text-base text-gray-900">{family.mobilePhone}</p>
              </div>
            )}

            {family.email && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Email</p>
                <p className="text-base text-gray-900 break-all">{family.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Family Members */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Family Members ({family.members.length})
        </h3>
        <div className="space-y-4">
          {family.members.map((member, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">
                  {member.name}
                  {member.isPrimary && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Head of Family
                    </span>
                  )}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-600">Date of Birth</p>
                  <p className="text-gray-900">{formatDateOfBirth(member.dateOfBirth)}</p>
                </div>

                {member.dateOfMarriage && (
                  <div>
                    <p className="font-semibold text-gray-600">Date of Marriage</p>
                    <p className="text-gray-900">{formatDate(member.dateOfMarriage)}</p>
                  </div>
                )}

                {member.phone && (
                  <div>
                    <p className="font-semibold text-gray-600">Phone</p>
                    <p className="text-gray-900">{member.phone}</p>
                  </div>
                )}

                {member.email && (
                  <div>
                    <p className="font-semibold text-gray-600">Email</p>
                    <p className="text-gray-900 break-all">{member.email}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FamilyDetails;
