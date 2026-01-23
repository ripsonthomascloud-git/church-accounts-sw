import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const AddMember = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    memberId: '',
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    email: '',
    prayerGroup: '',
    status: 'active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAdd(formData);
      setFormData({
        memberId: '',
        firstName: '',
        lastName: '',
        address: '',
        phone: '',
        email: '',
        prayerGroup: '',
        status: 'active',
      });
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Member ID"
        name="memberId"
        value={formData.memberId}
        onChange={handleChange}
        required
        placeholder="Enter unique member ID"
      />
      <Input
        label="First Name"
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
        required
        placeholder="Enter first name"
      />
      <Input
        label="Last Name"
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
        required
        placeholder="Enter last name"
      />
      <div className="mb-4">
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Address<span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter address"
          rows="3"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <Input
        label="Phone Number"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        required
        placeholder="Enter phone number"
      />
      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        required
        placeholder="Enter email address"
      />
      <Input
        label="Prayer Group"
        name="prayerGroup"
        value={formData.prayerGroup}
        onChange={handleChange}
        placeholder="Enter prayer group"
      />
      <div className="mb-4">
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="flex space-x-3">
        <Button type="submit" variant="primary">Add Member</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
};

export default AddMember;
