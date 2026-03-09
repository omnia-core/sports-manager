import { useParams } from 'react-router-dom'

export default function TeamDetailPage() {
  const { teamID } = useParams<{ teamID: string }>()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Team {teamID}</h1>
        <p className="mt-2 text-gray-500">Coming soon</p>
      </div>
    </div>
  )
}
