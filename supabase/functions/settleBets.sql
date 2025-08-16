-- Function: settle_bets(round_uuid uuid)
create or replace function public.settle_bets(p_round_id uuid)
returns void
language plpgsql
as $$
begin
  -- Example logic: update bets based on effective bet type/amount
  update bets b
  set status = case
    when (coalesce(a.override_bet_type, b.bet_type) = 'win') then 'win'
    else 'lose'
  end
  from admin_adjustments a
  where b.round_id = p_round_id
    and a.bet_id = b.id;
end;
$$;