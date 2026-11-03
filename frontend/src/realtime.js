import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { API } from './api'

// http://localhost:8080/api/v1  ->  ws://localhost:8080/ws
const WS_URL = API.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws') + '/ws'

/** Connects over WebSocket (STOMP). Everyone gets live availability; logged-in users also get private notifications. */
export function useRealtime(user, handlers) {
  const h = useRef(handlers); h.current = handlers
  const [live, setLive] = useState(false)
  useEffect(() => {
    const token = localStorage.getItem('token')
    const client = new Client({
      brokerURL: WS_URL, reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        setLive(true)
        client.subscribe('/topic/availability', m => h.current.onAvailability?.(JSON.parse(m.body)))
        if (token) client.subscribe('/user/queue/notifications', m => h.current.onNotification?.(JSON.parse(m.body)))
      },
      onWebSocketClose: () => setLive(false),
      onStompError: () => setLive(false),
    })
    client.activate()
    return () => { client.deactivate(); setLive(false) }
  }, [user?.id])
  return live
}
