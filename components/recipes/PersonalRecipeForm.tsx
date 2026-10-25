'use client';

import { useEffect, useRef, useState } from 'react';
import { useAddPersonalRecipe } from '@/hooks/usePersonalRecipes';
import { getBaseUnit, toBase } from '@/lib/unitNormalizer';
import type { Category, Difficulty, Recipe, Unit } from '@/types';

const UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'cup'];
const CATEGORIES: Category[] = ['grain', 'dairy', 'protein', 'veg', 'spice'];

interface IngredientDraft {
  id: string;
  name: string;
  quantity: string;
  unit: Unit;
  category: Category;
}

function emptyIngredient(): IngredientDraft {
  return { id: crypto.randomUUID(), name: '', quantity: '', unit: 'g', category: 'veg' };
}

async function optimizeImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');

  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The image could not be read.'));
      element.src = source;
    });
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const startX = (image.naturalWidth - size) / 2;
    const startY = (image.naturalHeight - size) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is not supported by this browser.');
    context.drawImage(image, startX, startY, size, size, 0, 0, 800, 800);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export default function PersonalRecipeForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const addRecipe = useAddPersonalRecipe();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('20');
  const [servings, setServings] = useState('2');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()]);
  const [imageData, setImageData] = useState('');
  const [imageName, setImageName] = useState('');
  const [error, setError] = useState('');
  const [processingImage, setProcessingImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [open, onClose]);

  if (!open) return null;

  function updateIngredient(id: string, patch: Partial<IngredientDraft>) {
    setIngredients((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function selectImage(file?: File) {
    if (!file) return;
    setProcessingImage(true);
    setError('');
    try {
      setImageData(await optimizeImage(file));
      setImageName(file.name);
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Image processing failed.');
    } finally {
      setProcessingImage(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const validIngredients = ingredients.filter((item) => item.name.trim() && Number(item.quantity) > 0);
    if (!imageData) return setError('Add a recipe image.');
    if (!validIngredients.length) return setError('Add at least one ingredient.');
    const steps = instructions.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
    if (!steps.length) return setError('Add at least one instruction step.');

    const now = new Date().toISOString();
    const recipeId = `personal-${crypto.randomUUID()}`;
    const recipe: Recipe = {
      id: recipeId,
      name: name.trim(),
      description: description.trim(),
      emoji: '🍽️',
      time_minutes: Number(time),
      servings: Number(servings),
      difficulty,
      created_at: now,
      source: 'personal',
      source_url: null,
      image_url: imageData,
      instructions: steps,
      recipe_ingredients: validIngredients.map((item, index) => ({
        id: `${recipeId}-ingredient-${index}`,
        ingredient_id: `personal-ingredient-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        quantity: Number(item.quantity),
        unit: item.unit,
        quantity_base: toBase(Number(item.quantity), item.unit),
        ingredient: {
          id: `personal-ingredient-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: item.name.trim(),
          category: item.category,
          default_unit: getBaseUnit(item.unit),
          price_per_unit: 0,
          created_at: now,
        },
      })),
    };

    try {
      await addRecipe.mutateAsync(recipe);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the recipe.');
    }
  }

  const inputClass = 'w-full rounded-lg border border-border bg-background-3 px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="personal-recipe-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="personal-recipe-title" className="font-head text-2xl">Add personal recipe</h2>
            <p className="mt-1 text-xs text-muted-foreground">Your photo is resized automatically and the recipe stays private to this signed-in browser.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close personal recipe form" className="rounded border border-border px-2 py-1 text-muted-foreground">×</button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Recipe name"><input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
            <Field label="Recipe image">
              <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} className={inputClass} />
              {imageName && <span className="text-[10px] text-green-400">Ready: {imageName}</span>}
            </Field>
            <Field label="Description"><input required value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></Field>
            <Field label="Difficulty"><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className={inputClass}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field>
            <Field label="Time · minutes"><input required type="number" min="1" max="600" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></Field>
            <Field label="Servings"><input required type="number" min="1" max="100" value={servings} onChange={(event) => setServings(event.target.value)} className={inputClass} /></Field>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Ingredients</h3>
              <button type="button" onClick={() => setIngredients((current) => [...current, emptyIngredient()])} className="text-xs text-accent">+ Add ingredient</button>
            </div>
            <div className="space-y-2">{ingredients.map((item, index) => (
              <div key={item.id} className="grid gap-2 rounded-lg border border-border bg-background-3 p-3 sm:grid-cols-[1fr_100px_90px_110px_auto]">
                <input aria-label={`Ingredient ${index + 1} name`} required value={item.name} onChange={(event) => updateIngredient(item.id, { name: event.target.value })} placeholder="Ingredient" className={inputClass} />
                <input aria-label={`Ingredient ${index + 1} quantity`} required type="number" min="0.001" step="any" value={item.quantity} onChange={(event) => updateIngredient(item.id, { quantity: event.target.value })} placeholder="Qty" className={inputClass} />
                <select aria-label={`Ingredient ${index + 1} unit`} value={item.unit} onChange={(event) => updateIngredient(item.id, { unit: event.target.value as Unit })} className={inputClass}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select>
                <select aria-label={`Ingredient ${index + 1} category`} value={item.category} onChange={(event) => updateIngredient(item.id, { category: event.target.value as Category })} className={inputClass}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
                <button type="button" disabled={ingredients.length === 1} onClick={() => setIngredients((current) => current.filter((entry) => entry.id !== item.id))} className="rounded border border-border px-2 text-xs text-red-300 disabled:opacity-30">Remove</button>
              </div>
            ))}</div>
          </section>

          <Field label="Instructions · one step per line"><textarea required rows={6} value={instructions} onChange={(event) => setInstructions(event.target.value)} className={inputClass} placeholder={'Prepare the ingredients.\nCook over medium heat.\nServe warm.'} /></Field>
          {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted-foreground">Cancel</button>
            <button type="submit" disabled={processingImage || addRecipe.isPending} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-bold text-background disabled:opacity-60">{processingImage ? 'Optimizing image…' : addRecipe.isPending ? 'Saving…' : 'Save personal recipe'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>{children}</label>;
}
