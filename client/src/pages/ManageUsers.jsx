import { useState, useEffect } from 'react';
import { Link, Users, Mail, Shield, Link as LinkIcon, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Select } from '../components/ui';
import Header from '../components/Header';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedContact, setSelectedContact] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchContacts();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/all-users`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CONTACTS.BASE, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data?.contacts) {
        setContacts(data.data.contacts);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleLinkUser = (user) => {
    setSelectedUser(user);
    setSelectedContact(user.contactId?._id || '');
    setShowLinkModal(true);
  };

  const handleSaveLink = async () => {
    if (!selectedContact) {
      toast.error('Please select a contact');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/link-user-contact`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: selectedUser._id,
          contactId: selectedContact,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('User linked to contact successfully');
        setShowLinkModal(false);
        fetchUsers(); // Refresh users list
      } else {
        toast.error(data.message || 'Failed to link user');
      }
    } catch (error) {
      toast.error('Failed to link user to contact');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="header-spacer" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users size={32} />
                Manage Users
              </h1>
              <p className="text-muted-foreground mt-2">
                Link portal users to contacts to enable invoice/bill viewing
              </p>
            </div>
            <Button onClick={() => window.location.href = '/create-user'}>
              Create New User
            </Button>
          </div>

          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Linked Contact</th>
                    <th className="text-center py-3 px-4 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User size={18} className="text-muted-foreground" />
                          <span className="text-foreground">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Mail size={18} className="text-muted-foreground" />
                          <span className="text-muted-foreground">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Shield size={18} className="text-muted-foreground" />
                          <span className={`capitalize ${
                            user.accountType === 'admin' 
                              ? 'text-primary font-semibold' 
                              : 'text-muted-foreground'
                          }`}>
                            {user.accountType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.contactId ? (
                          <div className="flex items-center gap-2">
                            <LinkIcon size={16} className="text-success" />
                            <span className="text-success font-medium">
                              {user.contactId.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-destructive text-sm">Not Linked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant={user.contactId ? 'outline' : 'primary'}
                          onClick={() => handleLinkUser(user)}
                        >
                          {user.contactId ? 'Change Link' : 'Link to Contact'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Link User to Contact Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Link User to Contact
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                User: <span className="text-foreground font-medium">
                  {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-foreground block mb-2">
                Select Contact
              </label>
              <Select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
              >
                <option value="">-- Select a Contact --</option>
                {contacts.map((contact) => (
                  <option key={contact._id} value={contact._id}>
                    {contact.name} ({contact.email})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                This contact's invoices/bills will be visible to this portal user
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLinkModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveLink}
                disabled={!selectedContact}
              >
                Link Contact
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
