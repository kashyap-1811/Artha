import { useEffect, useState } from "react";
import { getUserById, updateUser } from "../api/users";

function ProfilePage() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [isEditing, setIsEditing] = useState(false);
    const [editFullName, setEditFullName] = useState("");
    const [editActive, setEditActive] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const userId = localStorage.getItem("artha_user_id");
        if (!userId) return;

        fetchUserProfile(userId);
    }, []);

    async function fetchUserProfile(userId) {
        setIsLoading(true);
        setError("");
        try {
            const data = await getUserById(userId);
            setUser(data);
            setEditFullName(data.fullName || "");
            setEditActive(data.active !== false); // default to true unless explicitly false
        } catch (err) {
            setError(err.message || "Failed to load user profile");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleUpdate(event) {
        event.preventDefault();
        const userId = localStorage.getItem("artha_user_id");
        if (!userId) return;

        setIsUpdating(true);
        setError("");
        try {
            await updateUser(userId, {
                fullName: editFullName.trim(),
                active: editActive
            });
            await fetchUserProfile(userId);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || "Failed to update profile");
        } finally {
            setIsUpdating(false);
        }
    }

    return (
        <main className="company-shell">
            <section className="company-card">
                <header className="company-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>My Profile</h1>
                        <p>Manage your account settings</p>
                    </div>
                    {user && !isEditing && (
                        <button className="create-btn" onClick={() => setIsEditing(true)} type="button">
                            Edit Profile
                        </button>
                    )}
                </header>

                {isLoading ? (
                    <p className="dashboard-muted">Loading profile details...</p>
                ) : error ? (
                    <p className="dashboard-error">{error}</p>
                ) : user ? (
                    isEditing ? (
                        <form className="create-modal-form" onSubmit={handleUpdate} style={{ marginTop: '1rem' }}>
                            <label className="field">
                                <span className="field-label">Full Name</span>
                                <input
                                    value={editFullName}
                                    onChange={(e) => setEditFullName(e.target.value)}
                                    placeholder="Enter full name"
                                    autoFocus
                                    required
                                />
                            </label>

                            <label className="field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <input
                                    type="checkbox"
                                    checked={editActive}
                                    onChange={(e) => setEditActive(e.target.checked)}
                                    style={{ width: 'auto', margin: 0 }}
                                />
                                <span className="field-label" style={{ margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>Active Account</span>
                            </label>

                            <div className="create-modal-actions" style={{ marginTop: '1.5rem', gap: '1rem' }}>
                                <button className="create-cancel-btn" onClick={() => setIsEditing(false)} type="button">
                                    Cancel
                                </button>
                                <button className="create-confirm-btn" type="submit" disabled={isUpdating}>
                                    {isUpdating ? "Updating..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile-details">
                            <div className="profile-item">
                                <span className="profile-label">Full Name:</span>
                                <span className="profile-value">{user.fullName || "Not provided"}</span>
                            </div>
                            <div className="profile-item">
                                <span className="profile-label">Email:</span>
                                <span className="profile-value">{user.email}</span>
                            </div>
                            <div className="profile-item">
                                <span className="profile-label">Phone:</span>
                                <span className="profile-value">{user.phoneNumber || "Not provided"}</span>
                            </div>
                            <div className="profile-item">
                                <span className="profile-label">Status:</span>
                                <span className={`profile-status ${user.active ? "status-active" : "status-inactive"}`}>
                                    {user.active ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    )
                ) : (
                    <p className="dashboard-muted">No user profile found.</p>
                )}
            </section>
        </main>
    );
}

export default ProfilePage;
