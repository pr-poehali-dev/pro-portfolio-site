import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import Icon from '@/components/ui/icon'
import { toast } from '@/hooks/use-toast'

const API_URLS = {
  auth: 'https://functions.poehali.dev/e445d838-01ac-4bef-abf9-ff55b9ed07dd',
  works: 'https://functions.poehali.dev/c4974bcd-1653-4cf5-9451-0fbcd03e4f84',
  favorites: 'https://functions.poehali.dev/58b40516-0eac-49df-99d7-c99184260568',
  profile: 'https://functions.poehali.dev/fa3b21f5-7e84-41eb-a8aa-fe1a4d7301db'
}

interface User {
  id: number
  username: string
  nickname: string
  avatar_url?: string
  is_admin: boolean
}

interface Work {
  id: number
  user_id: number
  title: string
  description?: string
  image_url: string
  price?: number
  created_at: string
  author_nickname?: string
}

const ADMIN_PASSWORD = 'Nast8292jw'

export default function Index() {
  const [user, setUser] = useState<User | null>(null)
  const [works, setWorks] = useState<Work[]>([])
  const [favorites, setFavorites] = useState<Work[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [currentView, setCurrentView] = useState<'gallery' | 'favorites' | 'settings'>('gallery')
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [showWorkDialog, setShowWorkDialog] = useState(false)
  const [selectedWork, setSelectedWork] = useState<Work | null>(null)

  const [authForm, setAuthForm] = useState({ username: '', password: '' })
  const [profileForm, setProfileForm] = useState({ nickname: '', password: '', avatar: '' })
  const [workForm, setWorkForm] = useState({ title: '', description: '', price: '', image: '' })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('token')
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser))
      loadWorks()
    } else {
      loadWorks()
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadFavorites()
    }
  }, [user])

  const loadWorks = async () => {
    try {
      const response = await fetch(API_URLS.works)
      const data = await response.json()
      setWorks(data.works || [])
    } catch (error) {
      console.error('Error loading works:', error)
    }
  }

  const loadFavorites = async () => {
    if (!user) return
    try {
      const response = await fetch(`${API_URLS.favorites}?user_id=${user.id}`)
      const data = await response.json()
      setFavorites(data.favorites || [])
      setFavoriteIds(new Set((data.favorites || []).map((w: Work) => w.id)))
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: authMode, ...authForm })
      })
      const data = await response.json()
      
      if (data.success) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('token', data.token)
        setShowAuthDialog(false)
        setAuthForm({ username: '', password: '' })
        loadWorks()
        toast({ title: authMode === 'login' ? 'Добро пожаловать!' : 'Регистрация успешна!' })
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить запрос', variant: 'destructive' })
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsAdminMode(false)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setCurrentView('gallery')
    toast({ title: 'Вы вышли из системы' })
  }

  const toggleFavorite = async (workId: number) => {
    if (!user) {
      toast({ title: 'Войдите в систему', description: 'Для добавления в избранное нужно войти' })
      return
    }

    const isFavorite = favoriteIds.has(workId)
    
    try {
      if (isFavorite) {
        await fetch(`${API_URLS.favorites}?user_id=${user.id}&work_id=${workId}`, { method: 'DELETE' })
        setFavoriteIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(workId)
          return newSet
        })
      } else {
        await fetch(API_URLS.favorites, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, work_id: workId })
        })
        setFavoriteIds(prev => new Set([...prev, workId]))
      }
      loadFavorites()
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить избранное', variant: 'destructive' })
    }
  }

  const handleAdminAccess = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminMode(true)
      setShowAdminDialog(false)
      setAdminPassword('')
      toast({ title: 'Режим администратора активирован', description: 'Теперь вы можете публиковать работы' })
    } else {
      toast({ title: 'Неверный пароль', variant: 'destructive' })
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'work' | 'avatar') => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (target === 'work') {
          setWorkForm(prev => ({ ...prev, image: result }))
        } else {
          setProfileForm(prev => ({ ...prev, avatar: result }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isAdminMode) {
      toast({ title: 'Доступ запрещен', description: 'Только администраторы могут публиковать работы', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch(API_URLS.works, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          title: workForm.title,
          description: workForm.description,
          image_data: workForm.image,
          price: workForm.price ? parseFloat(workForm.price) : null
        })
      })
      const data = await response.json()
      
      if (data.success) {
        loadWorks()
        setShowWorkDialog(false)
        setWorkForm({ title: '', description: '', price: '', image: '' })
        toast({ title: 'Работа опубликована!' })
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось опубликовать работу', variant: 'destructive' })
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const updates: any = { user_id: user.id }
      if (profileForm.nickname) updates.nickname = profileForm.nickname
      if (profileForm.password) updates.password = profileForm.password
      if (profileForm.avatar) updates.avatar_url = profileForm.avatar

      const response = await fetch(API_URLS.profile, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await response.json()
      
      if (data.success) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        setProfileForm({ nickname: '', password: '', avatar: '' })
        toast({ title: 'Профиль обновлен!' })
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить профиль', variant: 'destructive' })
    }
  }

  const WorkCard = ({ work }: { work: Work }) => (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in">
      <div 
        className="relative aspect-square overflow-hidden bg-muted"
        onClick={() => setSelectedWork(work)}
      >
        {work.image_url ? (
          <img src={work.image_url} alt={work.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="Image" size={48} className="text-muted-foreground" />
          </div>
        )}
        {user && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(work.id)
            }}
          >
            <Icon 
              name={favoriteIds.has(work.id) ? "Heart" : "Heart"} 
              size={20} 
              className={favoriteIds.has(work.id) ? "fill-red-500 text-red-500" : ""}
            />
          </Button>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{work.title}</h3>
        {work.price && (
          <p className="text-primary font-bold text-xl">{work.price.toLocaleString('ru-RU')} ₽</p>
        )}
        {work.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{work.description}</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between max-w-full overflow-x-hidden">
          <div className="flex items-center gap-2">
            <Icon name="Palette" size={24} className="text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold truncate">Pro Portfolio</h1>
          </div>
          
          <nav className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('gallery')} className={currentView === 'gallery' ? 'bg-accent' : ''}>
                  <Icon name="Grid3x3" size={18} className="sm:mr-2" />
                  <span className="hidden sm:inline">Галерея</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('favorites')} className={currentView === 'favorites' ? 'bg-accent' : ''}>
                  <Icon name="Heart" size={18} className="sm:mr-2" />
                  <span className="hidden sm:inline">Избранное</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('settings')} className={currentView === 'settings' ? 'bg-accent' : ''}>
                  <Icon name="Settings" size={18} className="sm:mr-2" />
                  <span className="hidden sm:inline">Настройки</span>
                </Button>
                <Avatar className="cursor-pointer w-8 h-8 sm:w-10 sm:h-10" onClick={() => setCurrentView('settings')}>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.nickname[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </>
            ) : (
              <Button onClick={() => setShowAuthDialog(true)} size="sm">
                <Icon name="LogIn" size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">Войти</span>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
        {currentView === 'gallery' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Галерея работ</h2>
                <p className="text-muted-foreground">Профессиональное портфолио</p>
              </div>
              {user && isAdminMode && (
                <Button onClick={() => setShowWorkDialog(true)} size="lg" className="w-full sm:w-auto">
                  <Icon name="Plus" size={20} className="mr-2" />
                  Добавить работу
                </Button>
              )}
            </div>
            
            {works.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <Icon name="ImageOff" size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Пока нет работ</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {user && isAdminMode ? 'Добавьте свою первую работу!' : 'Войдите как администратор, чтобы добавить работы'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {works.map(work => <WorkCard key={work.id} work={work} />)}
              </div>
            )}
          </div>
        )}

        {currentView === 'favorites' && user && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-8">Избранное</h2>
            {favorites.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <Icon name="Heart" size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Избранное пусто</h3>
                <p className="text-sm text-muted-foreground">Добавьте работы в избранное, нажав на сердечко</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {favorites.map(work => <WorkCard key={work.id} work={work} />)}
              </div>
            )}
          </div>
        )}

        {currentView === 'settings' && user && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8">Настройки</h2>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Профиль</CardTitle>
                <CardDescription>Управление вашими данными</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={profileForm.avatar || user.avatar_url} />
                      <AvatarFallback className="text-2xl">{user.nickname[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="w-full sm:w-auto">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block text-center w-full sm:w-auto">
                          <Icon name="Upload" size={16} className="inline mr-2" />
                          Изменить аватар
                        </div>
                        <Input 
                          id="avatar-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, 'avatar')}
                        />
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nickname">Никнейм</Label>
                    <Input 
                      id="nickname" 
                      placeholder={user.nickname}
                      value={profileForm.nickname}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, nickname: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-password">Новый пароль</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      placeholder="Оставьте пустым, если не хотите менять"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <Icon name="Save" size={18} className="mr-2" />
                    Сохранить изменения
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Админ-панель</CardTitle>
                <CardDescription>
                  {isAdminMode ? 'Режим администратора активирован' : 'Получите доступ к публикации работ'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAdminMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <Icon name="CheckCircle" size={20} />
                      <span className="font-medium">Вы вошли как администратор</span>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAdminMode(false)
                        toast({ title: 'Вы вышли из режима администратора' })
                      }}
                      className="w-full"
                    >
                      <Icon name="LogOut" size={18} className="mr-2" />
                      Выйти из админ-панели
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowAdminDialog(true)} className="w-full">
                    <Icon name="Shield" size={18} className="mr-2" />
                    Войти в админ-панель
                  </Button>
                )}
              </CardContent>
            </Card>

            <Button variant="destructive" onClick={handleLogout} className="w-full">
              <Icon name="LogOut" size={18} className="mr-2" />
              Выйти из аккаунта
            </Button>
          </div>
        )}
      </main>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>{authMode === 'login' ? 'Вход' : 'Регистрация'}</DialogTitle>
            <DialogDescription>
              {authMode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                type="button"
                variant={authMode === 'login' ? 'default' : 'outline'}
                onClick={() => setAuthMode('login')}
                className="flex-1"
              >
                Вход
              </Button>
              <Button 
                type="button"
                variant={authMode === 'register' ? 'default' : 'outline'}
                onClick={() => setAuthMode('register')}
                className="flex-1"
              >
                Регистрация
              </Button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label htmlFor="username">Логин</Label>
                <Input 
                  id="username" 
                  required
                  value={authForm.username}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <Button type="submit" className="w-full">
                {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>Вход в админ-панель</DialogTitle>
            <DialogDescription>Введите пароль администратора</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-password">Пароль</Label>
              <Input 
                id="admin-password" 
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
              />
            </div>
            
            <Button onClick={handleAdminAccess} className="w-full">
              <Icon name="Shield" size={18} className="mr-2" />
              Войти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkDialog} onOpenChange={setShowWorkDialog}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить работу</DialogTitle>
            <DialogDescription>Опубликуйте новую работу в портфолио</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateWork} className="space-y-4">
            <div>
              <Label htmlFor="work-image">Изображение</Label>
              <div className="mt-2">
                {workForm.image ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={workForm.image} alt="Preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setWorkForm(prev => ({ ...prev, image: '' }))}
                    >
                      <Icon name="X" size={16} />
                    </Button>
                  </div>
                ) : (
                  <Label htmlFor="work-image-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-8 sm:p-12 text-center hover:border-primary transition-colors">
                      <Icon name="Upload" size={48} className="mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Нажмите для загрузки изображения</p>
                    </div>
                    <Input 
                      id="work-image-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'work')}
                    />
                  </Label>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="work-title">Название</Label>
              <Input 
                id="work-title" 
                required
                value={workForm.title}
                onChange={(e) => setWorkForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Введите название работы"
              />
            </div>

            <div>
              <Label htmlFor="work-description">Описание</Label>
              <Textarea 
                id="work-description"
                value={workForm.description}
                onChange={(e) => setWorkForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Опишите вашу работу"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="work-price">Цена (₽)</Label>
              <Input 
                id="work-price" 
                type="number"
                value={workForm.price}
                onChange={(e) => setWorkForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Укажите цену в рублях"
              />
            </div>

            <Button type="submit" className="w-full" disabled={!workForm.image}>
              <Icon name="Plus" size={18} className="mr-2" />
              Опубликовать работу
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedWork} onOpenChange={() => setSelectedWork(null)}>
        <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          {selectedWork && (
            <>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                <img 
                  src={selectedWork.image_url} 
                  alt={selectedWork.title} 
                  className="w-full h-full object-contain"
                />
              </div>
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">{selectedWork.title}</DialogTitle>
                {selectedWork.price && (
                  <p className="text-2xl sm:text-3xl font-bold text-primary mt-2">
                    {selectedWork.price.toLocaleString('ru-RU')} ₽
                  </p>
                )}
              </DialogHeader>
              {selectedWork.description && (
                <p className="text-muted-foreground mt-4 whitespace-pre-wrap">
                  {selectedWork.description}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}