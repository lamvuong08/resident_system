import type { HouseholdSummary } from '../../types/residentDashboard'
import HouseholdOverviewHeaderCard from './profile-household/HouseholdOverviewHeaderCard'
import '../../styles/profile-household-page.css'

export type HouseholdOverviewCardProps = {
  loading: boolean
  summary: HouseholdSummary | null
}

const HouseholdOverviewCard = ({ loading, summary }: HouseholdOverviewCardProps) => (
  <div className="profile-household-page">
    <HouseholdOverviewHeaderCard loading={loading} summary={summary} />
  </div>
)

export default HouseholdOverviewCard
