import React, { useState } from 'react';
import { Player } from '../../lib/types';
import { Users, Shield, UserX, Ban, Wifi } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

interface ConnectedPlayersListProps {
  players: Player[];
  maxPlayers: number;
  onKick: (name: string, reason?: string) => Promise<void>;
  onBan: (name: string, reason?: string) => Promise<void>;
  onToggleOp: (name: string, isOp: boolean) => Promise<void>;
}

export const ConnectedPlayersList: React.FC<ConnectedPlayersListProps> = ({
  players,
  maxPlayers,
  onKick,
  onBan,
  onToggleOp,
}) => {
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [actionType, setActionType] = useState<'kick' | 'ban' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActionConfirm = async () => {
    if (!activePlayer || !actionType) return;
    setLoading(true);
    try {
      if (actionType === 'kick') {
        await onKick(activePlayer.name, reason || 'Expulsado por administrador');
      } else if (actionType === 'ban') {
        await onBan(activePlayer.name, reason || 'Baneado por administrador');
      }
      setActivePlayer(null);
      setActionType(null);
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800/80">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Jugadores en Línea</h3>
            <p className="text-xs text-slate-400">Actividad actual en el mundo</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
          <span className="font-semibold text-emerald-400">{players.length}</span>
          <span className="text-slate-500">/</span>
          <span>{maxPlayers > 0 ? maxPlayers : '—'}</span>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400">
            <Users className="w-5 h-5" />
          </div>
          <p>No hay jugadores conectados actualmente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {players.map((player) => (
            <div
              key={player.uuid || player.name}
              className="p-3 rounded-xl bg-dark-950/60 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={`https://crafatar.com/avatars/${player.uuid || player.name}?size=40&default=MHF_Steve&overlay`}
                  alt={player.name}
                  className="w-10 h-10 rounded-lg shadow-sm bg-slate-800 shrink-0 image-pixelated"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${player.name}/40`;
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate block">{player.name}</span>
                    {player.isOp && (
                      <span title="Operador del servidor">
                        <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Wifi className="w-2.5 h-2.5" />
                      {player.ping !== undefined ? `${player.ping}ms` : 'Ping no disponible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onToggleOp(player.name, !player.isOp)}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    player.isOp
                      ? 'text-amber-400 hover:bg-amber-500/10'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                  }`}
                  title={player.isOp ? 'Revocar permisos OP' : 'Dar OP (Nivel 4)'}
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setActivePlayer(player);
                    setActionType('kick');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                  title="Expulsar jugador (Kick)"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setActivePlayer(player);
                    setActionType('ban');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Banear jugador"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kick/Ban confirmation modal */}
      <Modal
        isOpen={Boolean(activePlayer && actionType)}
        onClose={() => {
          setActivePlayer(null);
          setActionType(null);
        }}
        title={`${actionType === 'kick' ? 'Expulsar' : 'Banear'} a ${activePlayer?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            {actionType === 'kick'
              ? `¿Estás seguro de que deseas desconectar a ${activePlayer?.name} del servidor? Podrá volver a conectarse.`
              : `¿Estás seguro de que deseas añadir a ${activePlayer?.name} a la lista de baneados?`}
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Inactividad prolongada o comportamiento no permitido"
              className="w-full px-3.5 py-2 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setActivePlayer(null);
                setActionType(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleActionConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-medium text-white flex items-center gap-1.5 ${
                actionType === 'ban' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {loading ? 'Procesando...' : `Confirmar ${actionType === 'kick' ? 'Expulsión' : 'Baneo'}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
