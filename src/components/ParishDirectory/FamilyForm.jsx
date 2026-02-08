import { useState, useEffect } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { toInputDate } from '../../utils/dateUtils';

const FamilyForm = ({ family, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    familyName: '',
    prayerGroup: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    homePhone: '',
    mobilePhone: '',
    email: '',
    homeParish: '',
    photoUrl: '',
    members: [
      {
        name: '',
        dateOfBirth: '',
        dateOfMarriage: '',
        phone: '',
        email: '',
        isPrimary: true
      }
    ]
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (family) {
      setFormData({
        familyName: family.familyName || '',
        prayerGroup: family.prayerGroup || '',
        address: family.address || '',
        city: family.city || '',
        state: family.state || '',
        zipCode: family.zipCode || '',
        homePhone: family.homePhone || '',
        mobilePhone: family.mobilePhone || '',
        email: family.email || '',
        homeParish: family.homeParish || '',
        photoUrl: family.photoUrl || '',
        members: family.members && family.members.length > 0 ? family.members.map(m => ({
          ...m,
          dateOfMarriage: toInputDate(m.dateOfMarriage)
        })) : [
          {
            name: '',
            dateOfBirth: '',
            dateOfMarriage: '',
            phone: '',
            email: '',
            isPrimary: true
          }
        ]
      });
    }
  }, [family]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleMemberChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const addMember = () => {
    if (formData.members.length < 12) {
      setFormData(prev => ({
        ...prev,
        members: [
          ...prev.members,
          {
            name: '',
            dateOfBirth: '',
            dateOfMarriage: '',
            phone: '',
            email: '',
            isPrimary: false
          }
        ]
      }));
    }
  };

  const removeMember = (index) => {
    if (formData.members.length > 1) {
      setFormData(prev => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index).map((member, i) => ({
          ...member,
          isPrimary: i === 0
        }))
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.familyName.trim()) {
      newErrors.familyName = 'Family name is required';
    }

    const hasAtLeastOneMember = formData.members.some(m => m.name.trim() !== '');
    if (!hasAtLeastOneMember) {
      newErrors.members = 'At least one family member is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Filter out empty members
    const filteredMembers = formData.members.filter(m => m.name.trim() !== '');

    // Parse date of marriage strings to Date objects
    const membersWithDates = filteredMembers.map(m => ({
      ...m,
      dateOfMarriage: m.dateOfMarriage ? new Date(m.dateOfMarriage) : null
    }));

    const familyData = {
      ...formData,
      members: membersWithDates
    };

    onSave(familyData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
      {/* Family Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Family Name"
            name="familyName"
            value={formData.familyName}
            onChange={handleChange}
            required
            error={errors.familyName}
          />

          <Input
            label="Prayer Group"
            name="prayerGroup"
            value={formData.prayerGroup}
            onChange={handleChange}
          />

          <div className="md:col-span-2">
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
          />

          <Input
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            maxLength={2}
          />

          <Input
            label="ZIP Code"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
          />

          <Input
            label="Home Parish"
            name="homeParish"
            value={formData.homeParish}
            onChange={handleChange}
          />

          <Input
            label="Home Phone"
            name="homePhone"
            type="tel"
            value={formData.homePhone}
            onChange={handleChange}
          />

          <Input
            label="Mobile Phone"
            name="mobilePhone"
            type="tel"
            value={formData.mobilePhone}
            onChange={handleChange}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />

          <div className="md:col-span-2">
            <Input
              label="Photo URL (Google Drive Link)"
              name="photoUrl"
              value={formData.photoUrl}
              onChange={handleChange}
              placeholder="https://drive.google.com/file/d/..."
            />
          </div>
        </div>
      </div>

      {/* Family Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Family Members ({formData.members.length}/12)
          </h3>
          <Button
            type="button"
            onClick={addMember}
            disabled={formData.members.length >= 12}
            variant="secondary"
            className="text-sm"
          >
            + Add Member
          </Button>
        </div>

        {errors.members && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
            {errors.members}
          </div>
        )}

        <div className="space-y-4">
          {formData.members.map((member, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700">
                  Member {index + 1}
                  {member.isPrimary && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Head
                    </span>
                  )}
                </h4>
                {formData.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Name"
                  value={member.name}
                  onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                />

                <Input
                  label="Date of Birth (MM-DD)"
                  value={member.dateOfBirth}
                  onChange={(e) => handleMemberChange(index, 'dateOfBirth', e.target.value)}
                  placeholder="05-15"
                />

                <Input
                  label="Date of Marriage"
                  type="date"
                  value={member.dateOfMarriage}
                  onChange={(e) => handleMemberChange(index, 'dateOfMarriage', e.target.value)}
                />

                <Input
                  label="Phone"
                  type="tel"
                  value={member.phone}
                  onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                />

                <div className="md:col-span-2">
                  <Input
                    label="Email"
                    type="email"
                    value={member.email}
                    onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4 border-t">
        <Button type="submit" variant="primary">
          {family ? 'Update Family' : 'Add Family'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default FamilyForm;
