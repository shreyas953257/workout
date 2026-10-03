import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Empty } from '../ui/primitives'

/** Anything that is not one of the app's routes. */

export function NotFound() {
  const location = useLocation()

  return (
    <div className="page">
      <Card>
        <Empty
          icon="help-circle"
          title="That page does not exist"
          text={`Nothing in the app is routed to ${location.pathname}. Use the navigation, or start from one of these.`}
          action={
            <div className="row-2">
              <Link to="/" className="btn btn--primary btn--sm">
                <Icon name="target" size={13} />
                Dashboard
              </Link>
              <Link to="/workouts" className="btn btn--ghost btn--sm">
                <Icon name="dumbbell" size={13} />
                Train today
              </Link>
              <Link to="/docs" className="btn btn--quiet btn--sm">
                <Icon name="book-open" size={13} />
                Handbook
              </Link>
            </div>
          }
        />
      </Card>
    </div>
  )
}

export default NotFound
