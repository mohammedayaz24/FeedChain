import { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  MapPin,
  Clock,
} from 'lucide-react';
import { foodPosts, claims, distribution } from '../api/client';
import type { FoodPost, Claim, DistributionForm } from '../api/client';

const STATUS_LABEL: Record<string, string> = {
  claimed: 'Claimed – go pick up',
  picked: 'Picked – mark distribution',
  distributed: 'Distributed',
};

function getPost(claim: Claim): FoodPost | null {
  const fp = claim.food_posts;
  if (Array.isArray(fp) && fp.length) return fp[0];
  if (fp && typeof fp === 'object' && 'id' in fp) return fp as FoodPost;
  return null;
}

// Hardcoded OTP generator - same for all
const generateOTP = () => '123456';

export default function Ngo() {
  const [nearby, setNearby] = useState<FoodPost[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  
  // OTP verification state
  const [otpClaimId, setOtpClaimId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  
  // Distribution form state
  const [distributeClaimId, setDistributeClaimId] = useState<string | null>(null);
  const [distributeForm, setDistributeForm] = useState<Partial<DistributionForm>>({
    distribution_location: '',
    people_fed: undefined,
    distribution_date: '',
    distribution_time: '',
    impact_note: '',
  });

  function loadNearby() {
    setLoadingNearby(true);
    setError('');
    foodPosts
      .nearby(13.0827, 80.2707)
      .then(setNearby)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingNearby(false));
  }

  function loadClaims() {
    setLoadingClaims(true);
    setError('');
    claims
      .my()
      .then(setMyClaims)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingClaims(false));
  }

  useEffect(() => {
    loadNearby();
    loadClaims();
  }, []);

  function handleClaim(postId: string) {
    setError('');
    setActioning(postId);
    claims
      .claim(postId)
      .then(() => {
        loadNearby();
        loadClaims();
      })
      .catch((e) => setError(e.message))
      .finally(() => setActioning(null));
  }

  function handleCancel(claimId: string) {
    setError('');
    setActioning(claimId);
    claims
      .cancel(claimId)
      .then(() => loadClaims())
      .catch((e) => setError(e.message))
      .finally(() => setActioning(null));
  }

  function handlePickup(claimId: string) {
    setError('');
    const otp = generateOTP();
    setGeneratedOtp(otp);
    setOtpClaimId(claimId);
    setOtpValue('');
  }

  function handlePickup(claimId: string) {
    setError('');
    const otp = generateOTP();
    setGeneratedOtp(otp);
    setOtpClaimId(claimId);
    setOtpValue('');
  }

  function handleVerifyOtp() {
    if (!otpClaimId) return;
    
    console.log('🔐 Verifying OTP for claim:', otpClaimId);
    setError('');
    setActioning(otpClaimId);
    
    claims
      .pickup(otpClaimId)
      .then((res) => {
        console.log('✅ Pickup successful:', res);
        setOtpClaimId(null);
        setOtpValue('');
        setGeneratedOtp('');
        loadClaims();
      })
      .catch((e) => {
        console.error('❌ Pickup error:', e);
        setError(e.message);
      })
      .finally(() => {
        setActioning(null);
      });
  }

  function handleDistributeSubmit() {
    if (!distributeClaimId || !distributeForm.distribution_location?.trim() || distributeForm.people_fed == null) {
      setError('Distribution location and number of people fed are mandatory');
      return;
    }
    const num = Number(distributeForm.people_fed);
    if (Number.isNaN(num) || num < 1) {
      setError('Enter a valid number of people fed');
      return;
    }
    setError('');
    setActioning(distributeClaimId);
    distribution
      .distribute(distributeClaimId, {
        distribution_location: distributeForm.distribution_location.trim(),
        people_fed: num,
        distribution_date: new Date().toISOString().split('T')[0],
        distribution_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        impact_note: distributeForm.impact_note?.trim() || undefined,
      })
      .then(() => {
        setDistributeClaimId(null);
        setDistributeForm({
          distribution_location: '',
          people_fed: undefined,
          distribution_date: '',
          distribution_time: '',
          impact_note: '',
        });
        loadClaims();
      })
      .catch((e) => setError(e.message))
      .finally(() => setActioning(null));
  }

  function openDistribute(claimId: string) {
    setDistributeClaimId(claimId);
    setDistributeForm({
      distribution_location: '',
      people_fed: undefined,
      impact_note: '',
    });
  }

  return (
    <div className="container">
      <h1 className="page-title">NGO Dashboard</h1>
      {error && <p className="error-msg">{error}</p>}

      <section className="ngo-section">
        <h2>Available food to claim</h2>
        {loadingNearby ? (
          <p className="loading-msg"><Loader2 size={24} className="spin" /> Loading…</p>
        ) : nearby.length === 0 ? (
          <div className="empty-state card">
            <Package size={40} />
            <p>No available posts right now. Check back later.</p>
          </div>
        ) : (
          <ul className="post-list">
            {nearby.map((post) => (
              <li key={post.id} className="card post-card">
                <div className="post-meta">
                  {post.expiry_time && (
                    <span className="post-expiry">
                      <Clock size={14} /> Expires {new Date(post.expiry_time).toLocaleString()}
                    </span>
                  )}
                </div>
                <h3>{post.food_type}</h3>
                <p className="post-quantity">{post.quantity}</p>
                {(post.pickup_lat != null || post.pickup_lng != null) && (
                  <p className="post-location">
                    <MapPin size={14} /> {post.pickup_lat}, {post.pickup_lng}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleClaim(post.id)}
                  disabled={actioning === post.id}
                >
                  {actioning === post.id ? <Loader2 size={16} className="spin" /> : 'Claim'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ngo-section">
        <h2>My claims</h2>
        {loadingClaims ? (
          <p className="loading-msg"><Loader2 size={24} className="spin" /> Loading…</p>
        ) : myClaims.length === 0 ? (
          <div className="empty-state card">
            <Truck size={40} />
            <p>You have no claims yet. Claim food from the list above.</p>
          </div>
        ) : (
          <ul className="claim-list">
            {myClaims.map((claim) => {
              const post = getPost(claim);
              const isOtpOpen = otpClaimId === claim.id;
              const isDistributeOpen = distributeClaimId === claim.id;

              return (
                <li key={claim.id} className="card claim-card">
                  <div className="claim-header">
                    <span className={`post-status status-${claim.status.toLowerCase()}`}>
                      {STATUS_LABEL[claim.status] ?? claim.status}
                    </span>
                    {post && (
                      <span className="claim-food">{post.food_type} · {post.quantity}</span>
                    )}
                  </div>
                  {post?.expiry_time && (
                    <p className="post-expiry">
                      <Clock size={14} /> Expires {new Date(post.expiry_time).toLocaleString()}
                    </p>
                  )}
                  {claim.status === 'claimed' && (
                    <div className="claim-actions">
                      {isOtpOpen ? (
                        <div className="verify-box" style={{ padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '0.5rem', border: '2px solid #2ecc71' }}>
                          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                              📱 OTP Sent to Donor
                            </p>
                            <p style={{ fontSize: '2rem', letterSpacing: '0.3em', fontWeight: 'bold', color: '#2ecc71', fontFamily: 'monospace', marginBottom: '1rem' }}>
                              {generatedOtp}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#666' }}>
                              Confirm this OTP to verify pickup
                            </p>
                          </div>
                          <div className="btn-row">
                            <button 
                              type="button" 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => setOtpClaimId(null)}
                            >
                              ❌ Cancel
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-primary btn-sm" 
                              onClick={handleVerifyOtp} 
                              disabled={!!actioning}
                            >
                              {actioning === otpClaimId ? <Loader2 size={16} className="spin" /> : '✅ Confirm Pickup'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-accent btn-sm"
                            onClick={() => handlePickup(claim.id)}
                            disabled={!!actioning}
                          >
                            {actioning === claim.id ? <Loader2 size={16} className="spin" /> : '📞 Start Pickup'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleCancel(claim.id)}
                            disabled={!!actioning}
                          >
                            <XCircle size={16} /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {claim.status === 'picked' && (
                    <div className="claim-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openDistribute(claim.id)}
                        disabled={!!actioning}
                      >
                        <CheckCircle size={16} /> Mark distributed
                      </button>
                    </div>
                  )}
                  {claim.status === 'distributed' && claim.distribution_form && (
                    <div className="distributed-info">
                      <CheckCircle size={16} /> Distributed · {claim.distribution_form.people_fed} people fed
                      {claim.distribution_form.distribution_location && ` · ${claim.distribution_form.distribution_location}`}
                      {claim.distribution_form.impact_note && (
                        <p className="impact-note">{claim.distribution_form.impact_note}</p>
                      )}
                    </div>
                  )}
                  {isDistributeOpen && (
                    <div className="distribute-box" style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '0.5rem' }}>
                      <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>📍 Complete Distribution</h4>
                      <div className="form-group">
                        <label>📍 Distribution Location *</label>
                        <input
                          value={distributeForm.distribution_location || ''}
                          onChange={(e) => setDistributeForm({ ...distributeForm, distribution_location: e.target.value })}
                          placeholder="e.g. Community Center, Shelter A, Street Name"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>👥 Number of People Fed *</label>
                        <input
                          type="number"
                          min={1}
                          value={distributeForm.people_fed || ''}
                          onChange={(e) => setDistributeForm({ ...distributeForm, people_fed: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="e.g. 45"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>💬 Impact Note (optional)</label>
                        <textarea
                          value={distributeForm.impact_note || ''}
                          onChange={(e) => setDistributeForm({ ...distributeForm, impact_note: e.target.value })}
                          placeholder="e.g. Distributed to families and individuals in need"
                          rows={2}
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <div className="btn-row">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDistributeClaimId(null)}>
                          ❌ Cancel
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleDistributeSubmit} disabled={!!actioning}>
                          {actioning === distributeClaimId ? <Loader2 size={16} className="spin" /> : '✅ Complete Distribution'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
