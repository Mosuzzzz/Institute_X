import { recentUsers, roleDistribution } from '../owner-data';

export default function OwnerUsersPage() {
  return (
    <main className="teacher-main owner-main">
      <header className="teacher-page-heading"><div><p className="eyebrow">Account oversight</p><h1>Users</h1><p>Read-only visibility into application roles and recent account activity.</p></div><span className="owner-live-label">1,248 total · Demo data</span></header>
      <section className="owner-role-grid" aria-label="User role distribution">
        {roleDistribution.map((item, index) => <article key={item.role}><span>0{index + 1}</span><div><p>{item.role}</p><strong>{item.count.toLocaleString()}</strong><small>{item.state}</small></div><b>{item.share}%</b></article>)}
      </section>
      <section className="owner-list-section"><div className="teacher-section-heading"><div><p className="eyebrow">Recent presence</p><h2>Active accounts</h2></div><span>Read only</span></div><div className="owner-user-table"><header><span>User</span><span>Role</span><span>Affiliation</span><span>Status</span><span>Last seen</span></header>{recentUsers.map((user) => <div key={user.id}><div><strong>{user.name}</strong><small>{user.id}</small></div><span>{user.role}</span><span>{user.affiliation}</span><b><i />{user.state}</b><time>{user.seen}</time></div>)}</div></section>
      <p className="teacher-demo-note">Demo user directory — the current backend exposes the total user count but does not yet expose an Owner user-list endpoint.</p>
    </main>
  );
}
