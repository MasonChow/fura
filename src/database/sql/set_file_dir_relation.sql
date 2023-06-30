select
  file.id as file_id,
  dir.id as dir_id
from
  file
  join dir on dir.path = file.parent_path;